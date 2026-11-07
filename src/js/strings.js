/* ============================================================
   STRINGS
   Every user-visible string, keyed by id; a second language is a second
   object here. Values are strings, or functions where word order or plurals
   vary. Catalog labels are `catalog.<id>.label`, attached by
   applyCatalogLabels(). The Help body is one key, as it's only shown whole.
   ============================================================ */
const STRINGS = {
  en: {
    'app.title': 'Floor Layout Planner',
    'app.pageTitle': 'Floor Layout Planner',
    'header.new': 'New',
    'header.new.title': 'New layout',
    'header.save': 'Save',
    'header.save.title': 'Save layout (Ctrl+S)',
    'header.load': 'Load',
    'header.load.title': 'Load layout (Ctrl+O)',
    'header.help': 'Help',
    'header.help.title': 'Help',
    'header.mode.title': 'Free Mode places anything; Limited Mode only what you own',
    'header.mode.free': 'Free Mode',
    'header.mode.limited': 'Limited Mode',
    'header.inventory': 'Inventory',
    'header.inventory.title': 'The pieces you own, for Limited Mode',
    'inv.title': 'Owned inventory',
    'inv.close.title': 'Close without saving',
    'inv.search.placeholder': 'Search pieces or codes\u2026',
    'inv.pack.placeholder': 'Catalogue no., e.g. 20-221',
    'inv.pack.add': 'Add a pack',
    'inv.pack.added': (no, list) => `Added ${no}: ${list}.`,
    'inv.pack.unknown': no => `No KATO pack ${no} in the catalogue.`,
    'inv.save': 'Save',
    'inv.load': 'Load',
    'inv.confirm': 'Confirm',
    'inv.total': n => `${n} piece${n===1?'':'s'} owned`,
    'inv.loaded': n => `Loaded ${n} piece${n===1?'':'s'}. Confirm to use them.`,
    'inv.loadedSkipped': (n, k) => `Loaded ${n} piece${n===1?'':'s'}; ${k} unknown type${k===1?' was':'s were'} skipped. Confirm to use them.`,
    'inv.loadFailed': 'That file isn\u2019t a KATO planner inventory.',
    'inv.filename': 'kato-inventory',
    'limited.short': code => `Limited Mode: no ${code} left in your inventory.`,
    'header.theme.title': 'Skin / theme',
    'header.undo': 'Undo',
    'header.undo.title': 'Undo (Ctrl+Z)',
    'header.redo': 'Redo',
    'header.redo.title': 'Redo (Ctrl+Shift+Z)',
    'header.lang.title': 'Language',
    'header.settings': 'Settings',
    'header.settings.title': 'Settings: theme and language',
    'settings.title': 'Settings',
    'settings.general': 'General',
    'settings.units': 'Units',
    'settings.units.mm': 'Millimetres (mm)',
    'settings.units.in': 'Inches (in)',
    'unit.mm': 'mm',
    'unit.in': 'in',
    'settings.planning': 'Planning',
    'settings.slope': 'Steepest slope',
    'settings.slope.kato': '4% (KATO\u2019s standard)',
    'settings.slope.title': 'The steepest slope you build to. Gradient Mode colours slopes against it, and the warning triangle appears at half as steep again.',
    'settings.detail': 'Hide detail when zoomed out',
    'settings.detail.title': 'Ties hide below 1.00\u00d7 zoom and the green dots and orange arrows below 0.30\u00d7. Sooner hides them at twice those, Later at half.',
    'settings.detail.sooner': 'Sooner',
    'settings.detail.default': 'Normal',
    'settings.detail.later': 'Later',
    'settings.detail.never': 'Never',
    'settings.arrows': 'Arrow key steps',
    'settings.step.plain': 'Arrow key',
    'settings.step.shift': 'Shift + arrow key',
    'settings.step.ctrl': 'Ctrl + arrow key',
    'settings.step.title': 'How far this moves the selection',
    'settings.step.reset.title': 'Back to the default step',
    'settings.saving': 'Saving',
    'settings.autosave': 'Autosave in this browser',
    'settings.autosave.title': 'Keep a copy of the layout in this browser as you work, restored next time. Turning it off deletes that copy.',
    'settings.forget.label': 'Saved data',
    'settings.forget': 'Forget everything',
    'settings.forget.title': 'Delete everything the planner keeps in this browser',
    'settings.forget.confirm': 'Delete everything the planner keeps in this browser (the autosaved layout, your inventory and all settings) and start afresh? Layouts saved as files aren\u2019t affected.',
    'settings.colours': 'Track colours',
    'settings.colour.ground': 'Roadbed',
    'settings.colour.elev-flat': 'Elevated, level',
    'settings.colour.slope-low': 'Slope bottom',
    'settings.colour.slope-high': 'Slope top',
    'settings.colour.power-near': 'Power View: at a feeder',
    'settings.colour.power-far': 'Power View: at the limit',
    'settings.colour.sel': 'Selected',
    'settings.reset.title': 'Back to the default colour',

    'help.title': 'User guide',
    'help.search.placeholder': 'Search the guide\u2026',
    'help.search.none': 'Nothing in the guide matches.',
    'help.close.title': 'Close',

    // The Gestures window (from the empty layout's start screen).
    'header.gestures': 'Gestures',
    'header.gestures.title': 'Gestures',
    'gest.title': 'Gestures',
    'gest.search.placeholder': 'Search gestures\u2026',
    'gest.search.none': 'No gestures match.',
    'gest.more': 'Every control and shortcut is in the <a href="#" id="gestHelpLink">User guide</a>.',
    'gest.rotate.title': 'Rotate while dragging',
    'gest.rotate.desc': 'Hold a piece and scroll: it turns 15° per notch. <kbd>Q</kbd> / <kbd>E</kbd> do the same.',
    'gest.morph.title': 'Change size while dragging',
    'gest.morph.desc': 'Hold <kbd>Shift</kbd> and scroll: the piece becomes the next size in its family, such as S248, S186, S124, S64. Curves change length, keeping their radius.',
    'gest.flip.title': 'Flip while dragging',
    'gest.flip.desc': 'Press <kbd>F</kbd> to swap a turnout, or any piece with a left and right version, for its mirror image.',
    'gest.section.find': 'Finding pieces',
    'gest.section.build': 'Building track',
    'gest.section.drag': 'While dragging',
    'gest.section.select': 'Selecting',
    'gest.section.slopes': 'Slopes',
    'gest.search.title': 'Type a number to search',
    'gest.search.desc': 'Type a number anywhere in the planner and the palette searches for it: 249 finds R249 curves. Drag a piece straight out of the results; the × (or pressing <kbd>Esc</kbd>) clears the search.',
    'gest.headings.title': 'Fold the palette',
    'gest.headings.desc': 'Click a heading to fold its group away. Right-click any heading to fold every group, and again to open them all.',
    'gest.slope.title': 'Lay a slope in one go',
    'gest.slope.desc': () => `In Gradient Mode (<kbd>G</kbd>), click the first piece of the climb, then the last: the run between is coloured by its steepness, green at ${gradientTargetPct}%${gradientTargetPct===4 ? ', KATO\u2019s standard' : ''}. The tick, or pressing <kbd>Enter</kbd>, confirms it.`,
    'gest.fills.title': 'Browse other fills',
    'gest.fills.desc': 'While a fill is previewed, scroll or press <kbd>,</kbd> and <kbd>.</kbd> to see the others: exact fits first, then those needing the least joiner play. <kbd>Enter</kbd> places the one shown.',
    'gest.slopeSteps.title': 'Lay a slope piece by piece',
    'gest.slopeSteps.desc': 'In Gradient Mode, click the first piece, then a purple arrow to add the next. <kbd>,</kbd> and <kbd>.</kbd> use the arrow facing left or up, or right or down, so as the track turns, the other key adds. The darker arrow, pointing back, takes the last piece off.',
    'gest.shiftClick.title': 'Click and Shift+click',
    'gest.shiftClick.desc': 'Click a piece to select it. <kbd>Shift</kbd>+click adds another piece to the selection, or takes one out again. Click empty canvas to deselect.',
    'gest.section.view': 'Viewing the layout',
    'gest.pan.title': 'Pan the view',
    'gest.pan.desc': 'Drag empty canvas to move the view, or hold <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>.',
    'gest.zoom.title': 'Zoom the view',
    'gest.zoom.desc': 'Scroll over empty canvas to zoom in or out, about the point under the pointer. <kbd>+</kbd> and <kbd>\u2212</kbd> zoom too.',
    'gest.fit.title': 'Fit the layout in view',
    'gest.fit.desc': '<kbd>Space</kbd>, or the \u21ba button, zooms and pans so the whole layout fits.',
    'gest.ties.title': 'Show or hide detail',
    'gest.ties.desc': '<kbd>T</kbd> shows or hides the ties (sleepers) and slab detail, leaving the bare roadbed and rails. Detail hides itself below 1.00\u00d7 zoom.',
    'gest.labels.title': 'Cycle the part labels',
    'gest.labels.desc': '<kbd>L</kbd> steps through Limited (only pieces easily mistaken for another), Printed (on every piece), All (every part code, readable zoomed out) and Off.',
    'gest.ports.title': 'Show or hide ends and arrows',
    'gest.ports.desc': () => `<kbd>P</kbd> hides the green ends and orange arrows for a clean look at the track.${portsView.below ? ` They hide themselves below ${formatZoom(portsView.below)} zoom.` : ''}`,
    'gest.level.title': 'Focus on one level',
    'gest.level.desc': '<kbd>V</kbd> fades the elevated track to work on the ground, then the ground to work on the elevated track, then shows both again.',
    'gest.groupTurn.title': 'Turn a whole selection',
    'gest.groupTurn.desc': 'Drag any piece of a selection and scroll: the whole group turns as one, about the piece you’re holding.',
    'gest.carry.title': 'Carry a piece past the edge',
    'gest.carry.desc': 'While dragging, hold <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> to pan. The piece stays in your hand, so you can take it anywhere on the layout.',
    'gest.expansion.title': 'Stretch an expansion track',
    'gest.expansion.desc': 'Drop an S78S on an open end: if another end faces it 78 to 108 mm away, it stretches to join both. <kbd>Shift</kbd>+scroll while dragging sets its length 1 mm at a time.',
    'gest.cancel.title': 'Change your mind mid-drag',
    'gest.cancel.desc': '<kbd>Ctrl</kbd>+<kbd>Z</kbd> while dragging puts the piece back where it was. A palette piece dropped back on the palette is cancelled.',
    'gest.chain.title': 'Lay a run by clicking',
    'gest.chain.desc': 'Click a green end, then click pieces in the palette. Each one joins on where the last ended.',
    'gest.dup.title': 'Repeat a piece',
    'gest.dup.desc': 'Double-click a green end to add another of the same piece there.',
    'gest.connected.title': 'Select a whole run',
    'gest.connected.desc': 'Double-click a piece to select everything joined to it.',
    'gest.extend.title': 'Extend the selection',
    'gest.extend.desc': 'Click an orange arrow to add everything beyond it. <kbd>,</kbd> and <kbd>.</kbd> do the same from the keyboard.',
    'gest.marquee.title': 'Box select',
    'gest.marquee.desc': 'Right-drag a box: every piece with an end inside it is selected. Hold <kbd>Shift</kbd> to add to the selection.',
    'gest.gapFill.title': 'Fill a gap',
    'gest.gapFill.desc': 'Click a green end, then <kbd>Shift</kbd>+click another: the planner finds pieces that join them. Scroll for other fills; <kbd>Enter</kbd> places it. <kbd>J</kbd> picks the nearest end for you.',
    // GENERATED from help-guide.md by build-help.ps1: edit the guide there, not
    // here, or the next build overwrites the change. Section ids (help-*) are
    // what the guide's section list jumps to.
    'help.body.html': `<div class="help-layout">
      <nav class="help-nav" aria-label="Guide sections">
        <a href="#help-start">Getting started</a>
        <a href="#help-view">Viewing the layout</a>
        <a href="#help-placing">Placing track</a>
        <a href="#help-selecting">Selecting</a>
        <a href="#help-editing">Moving &amp; editing</a>
        <a href="#help-joins">How track joins</a>
        <a href="#help-gradient">Slopes &amp; Gradient Mode</a>
        <a href="#help-power-view">Power View</a>
        <a href="#help-tabletop">Tabletops</a>
        <a href="#help-text-labels">Text labels</a>
        <a href="#help-sets">Unitrack Sets</a>
        <a href="#help-special">Special pieces</a>
        <a href="#help-limited">Limited Mode &amp; Inventory</a>
        <a href="#help-parts">Parts list &amp; buying</a>
        <a href="#help-files">Files &amp; settings</a>
        <a href="#help-keys">Keyboard shortcuts</a>
        <a href="#help-about">About</a>
      </nav>
      <div class="help-content">

      <section id="help-start">
        <h3>Getting started</h3>
        <p>Plan a layout with real KATO Unitrack. Every piece is its real size, measured in millimetres, and track joins only where the real pieces would.</p>
        <p>Unitrack's primary use is for non-permanent layouts that can be set up and taken down in a day. This planner is intended for designing these temporary floor layouts, known in Japan as “畳レイアウト” (Tatami Mat Layout), and isn't meant to be used to design intricate or complex model railways. As such, there are only two elevations: 0mm (ground level), and 50mm (KATO's standard bridge height).</p>
        <p>Try the following to get started!</p>
        <ol>
          <li><strong>Drag a piece</strong> from the palette on the left onto the canvas. Drop it near the end of existing track and it snaps on.</li>
          <li><strong>Keep building:</strong> click a green dot <span class="swatch dot" style="background:#3ddc84"></span>(an open track end), then click pieces in the palette. Each one attaches to the end of the last, so you can lay a whole run by clicking.</li>
          <li><strong>Arrange:</strong> drag pieces to move them, and scroll while dragging to rotate them.</li>
          <li><strong>Export:</strong> Export Parts List shows what you need to build your design, and “Show as packs” the fewest KATO packs that cover it.</li>
          <li><strong>Learn gestures:</strong> Learn about the gestures and shortcuts to help you build faster.</li>
        </ol>
        <p><button type="button" class="hdrbtn" data-help-open="gestures">✋ Gestures</button></p>
        <p>An empty layout also offers every Unitrack Set to start from. Hover over one to see it, and click to place it.</p>
        <p>The green panel on the right always explains whatever the pointer is over, including any shortcuts that work there. If you're unsure what something does, hover over it.</p>
      </section>

      <section id="help-view">
        <h3>Viewing the layout</h3>
        <div class="help-row"><span class="keys">Drag empty canvas, or hold <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd></span><span class="desc">Pan. An empty layout doesn't pan.</span></div>
        <div class="help-row"><span class="keys">Scroll over empty canvas, − / +, or the <kbd>+</kbd> / <kbd>−</kbd> keys</span><span class="desc">Zoom. The number between the buttons is the current zoom.</span></div>
        <div class="help-row"><span class="keys">↺, or <kbd>Space</kbd></span><span class="desc">Fit the whole layout in view.</span></div>
        <div class="help-row"><span class="keys">↕ ↓ ↑, or <kbd>V</kbd></span><span class="desc">Show every level at full strength (↕), or fade the other level to work on ground (↓) or elevated (↑) track. <kbd>V</kbd> moves to the next of the three each time.</span></div>
        <div class="help-row"><span class="keys">Detail button, or <kbd>T</kbd></span><span class="desc">Show or hide track detail: the ties (sleepers), on slab track the slab and its fastenings, and on Unitram street track the paving, its joints and the road markings, leaving the bare roadbed and rails. The icon shows what's on screen now. They also hide themselves below 1.00× zoom (⚙️ Settings can make that sooner, later or never); turn them on there to keep them until you next zoom back in.</span></div>
        <div class="help-row"><span class="keys">Labels button, or <kbd>L</kbd></span><span class="desc">Part labels, four settings in turn: Limited (the default) labels only the pieces easily mistaken for a similar one, such as the S64 and the S60s; Printed labels every piece the same way, printed on the track so they grow and shrink with it; All labels every piece with its part code, horizontal, readable when zoomed out and growing with the track above 1.00× zoom, and moved along its piece where labels would crowd, or left off if there's no room anywhere along it; Off shows none. The icon shows the current setting.</span></div>
        <div class="help-row"><span class="keys">Ports button, or <kbd>P</kbd></span><span class="desc">The same for the green dots and orange arrows, below 0.30×. The selected end (blue dot) and the snap highlights always show, and <kbd>,</kbd> and <kbd>.</kbd> still work.</span></div>
        <p>If the planner is running sluggishly, or you've placed many pieces, try turning detail off.</p>
        <p>A dashed detail or ports button means you have them on, but they're hidden at this zoom. The side panel shows the layout's piece count, total track length and footprint.</p>
      </section>

      <section id="help-placing">
        <h3>Placing track</h3>
        <p>On the left side of the window is the "palette", where every KATO Unitrack piece is available for you to place.</p>
        <div class="help-row"><span class="keys">Drag a palette piece</span><span class="desc">Place it. Near a green dot <span class="swatch dot" style="background:#3ddc84"></span>it snaps on; anywhere else it lands where you drop it. Drop it back on the palette to cancel.</span></div>
        <div class="help-row"><span class="keys">Scroll while dragging, or <kbd>Q</kbd> / <kbd>E</kbd></span><span class="desc">Rotate it 15° per notch or key press.</span></div>
        <div class="help-row"><span class="keys"><kbd>Shift</kbd>+Scroll while dragging</span><span class="desc">Morph the piece into different size, such as another length or radius, where there is one. At the last size it turns back instead of jumping to the first. An expansion track (S78S) changes its length instead, 1mm at a time from 78 to 108mm.</span></div>
        <div class="help-row"><span class="keys"><kbd>F</kbd> while dragging</span><span class="desc">Flip it to its mirror image, if available. e.g. turnouts.</span></div>
        <div class="help-row"><span class="keys">Click a green dot, then a palette piece</span><span class="desc">Attach that piece there. The new piece's far end becomes the selected end, so each further click extends the run.</span></div>
        <div class="help-row"><span class="keys">Double-click a green dot <span class="swatch dot" style="background:#3ddc84"></span></span><span class="desc">Add a duplicate of the same piece at that end.</span></div>
        <div class="help-row"><span class="keys">Click a palette piece (with no green dot selected)</span><span class="desc">Place it in the middle of the view. Clicking again without moving the view steps each new piece a little down and right, as repeated pastes do.</span></div>
        <div class="help-row"><span class="keys">Select a green dot, then Shift+click another</span><span class="desc">Fill the gap between the two ends: the planner finds runs of up to 6 pieces that join them exactly (or within the play of real joiners) without crossing other track, and previews the best.</span></div>
        <div class="help-row"><span class="keys">Select a green dot, then <kbd>J</kbd> or Fill Gap in the side panel</span><span class="desc">The same, joining it to the nearest open end it can reach.</span></div>
        <div class="help-row"><span class="keys">While a fill is previewed</span><span class="desc">Scroll, or <kbd>,</kbd> and <kbd>.</kbd>, show the other fills: exact fits first, then those needing the least joiner play; fewer and commoner pieces first where fits tie. <kbd>Enter</kbd>, or a click on the preview, places it; <kbd>Esc</kbd> or a click elsewhere cancels.</span></div>
        <p>Drop an expansion track (S78S) with one end on open track, and if an open end faces it 78 to 108mm further along the same line, it stretches to join both. A wider or narrower gap leaves it at its length, joined at one end. Its current length is printed on it.</p>
        <p>Search the palette by name, catalogue number or part code by typing into the search bar in the top left. Hyphens are optional, so “20000” finds 20-000. Typing a number anywhere starts a new search with it, so just typing 249 shows the R249 curves; <kbd>Esc</kbd>, or a click anywhere else (dragging a piece out included), gives the keys back to the layout. To clear the search, click its ×, or press <kbd>Esc</kbd> again when nothing is selected.</p>
        <p>Click a category heading to collapse it; right-click one to collapse or expand them all. Indented subcategories, such as Straights (Concrete Tie), hold other versions of the same pieces; they stay visible when their parent is collapsed, and expanding them all leaves them closed.</p>
        <p>Curves come in one hand: attach one by either end to turn left or right.</p>
        <p>Fill Gap joins single track, using plain pieces (and an expansion track where a straight gap needs one). In Limited Mode it only uses pieces from your inventory that aren't already on the layout.</p>
        <p>Between ends at different heights, the fill is graded evenly from one height to the other, and the preview shows its slope. It can come out steeper than your slope limit (KATO's 4% unless you change it in ⚙️ Settings); at half as steep again (6% for 4%) or steeper, a warning appears on it once it's placed. Scroll through the other fills for a longer, gentler one. <kbd>J</kbd> tries ends at the same height first. As in Gradient Mode, there must be at least one flat piece between two gradients, so a fill between different heights can't start or finish on a slope.</p>
      </section>

      <section id="help-selecting">
        <h3>Selecting</h3>
        <p>Several shortcuts are available to help you quickly select any placed track you wish to edit.</p>
        <div class="help-row"><span class="keys">Click a piece</span><span class="desc">Select it, replacing the current selection.</span></div>
        <div class="help-row"><span class="keys"><kbd>Shift</kbd>+Click a piece</span><span class="desc">Add it to the selection, or remove it.</span></div>
        <div class="help-row"><span class="keys">Double-click a piece</span><span class="desc">Select everything connected to it.</span></div>
        <div class="help-row"><span class="keys">Orange arrow, or <kbd>,</kbd> / <kbd>.</kbd></span><span class="desc">Extend the selection in that direction, through everything beyond that end. <kbd>,</kbd> (the <kbd>&lt;</kbd> key) uses the arrow facing furthest left or up, <kbd>.</kbd> (the <kbd>&gt;</kbd> key) the one facing furthest right or down.</span></div>
        <div class="help-row"><span class="keys">Right-drag</span><span class="desc">Draw a marquee selection box: every piece with a track end inside it is selected.</span></div>
        <div class="help-row"><span class="keys"><kbd>Shift</kbd>+Right-drag</span><span class="desc">Box-select, adding to the selection.</span></div>
        <div class="help-row"><span class="keys">Crosshair on, tap <kbd>Ctrl</kbd></span><span class="desc">Box-select without the mouse, adding to the selection: a small white box around the crosshair shows it's on, the selection box starts at the crosshair, and its corner follows as <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> pan. Tap <kbd>Ctrl</kbd> again to finish, or <kbd>Esc</kbd> to cancel. Let go of <kbd>Ctrl</kbd> before panning: <kbd>Ctrl</kbd>+<kbd>W</kbd> closes the browser tab.</span></div>
        <div class="help-row"><span class="keys"><kbd>Ctrl</kbd>+<kbd>A</kbd></span><span class="desc">Select every piece.</span></div>
        <div class="help-row"><span class="keys"><kbd>Esc</kbd>, or click empty canvas</span><span class="desc">Deselect.</span></div>
        <p>The side panel shows what's selected: the piece and its part code, or a count of each part.</p>
      </section>

      <section id="help-editing">
        <h3>Moving &amp; editing</h3>
        <div class="help-row"><span class="keys">Drag a piece</span><span class="desc">Move it, or the whole selection if it's part of one. Joins to pieces outside the selection break as you pull away; drop near a green dot to join somewhere else.</span></div>
        <div class="help-row"><span class="keys">Scroll, while dragging</span><span class="desc">Rotate the piece. A selection turns as one group about the piece you're holding.</span></div>
        <div class="help-row"><span class="keys"><kbd>Q</kbd> / <kbd>E</kbd>, with a selection</span><span class="desc">Turn it 15° anticlockwise / clockwise about its centre. Joins to pieces outside the selection break, as when dragging; ends that land exactly on another end join.</span></div>
        <div class="help-row"><span class="keys">Tap <kbd>Shift</kbd></span><span class="desc">Select without the mouse: turn on a crosshair in the middle of the canvas, and tap <kbd>Shift</kbd> again or press <kbd>Esc</kbd> to turn it off. <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> pan the layout beneath it, slowly at first and faster the longer you hold them.</span></div>
        <div class="help-row"><span class="keys">Crosshair on, tap <kbd>Space</kbd></span><span class="desc">Select the piece under the crosshair, adding it to the selection, or deselect it if it's already selected. Pan to the next piece and tap again to build up a selection.</span></div>
        <div class="help-row"><span class="keys">Crosshair on, hold <kbd>Space</kbd> and pan</span><span class="desc">Select every piece the crosshair passes over. If you start on a piece that's already selected, deselect them instead.</span></div>
        <div class="help-row"><span class="keys">Arrow keys, with a selection</span><span class="desc">Move it 33&nbsp;mm, KATO's track spacing. <kbd>Shift</kbd> moves it 165&nbsp;mm, <kbd>Ctrl</kbd> just 3&nbsp;mm. You can change all three in ⚙️ Settings. Joins to pieces outside the selection break, and it snaps to any end the step brings within range. Stepping away from a join doesn't snap back.</span></div>
        <div class="help-row"><span class="keys"><kbd>Shift</kbd>+Scroll, whilst dragging</span><span class="desc">Morph the piece into a different size. An expansion track changes length, and its end moving away comes unjoined.</span></div>
        <div class="help-row"><span class="keys"><kbd>F</kbd></span><span class="desc">Flip the one selected piece in place. Joins that still line up are kept. Also works whilst dragging a piece.</span></div>
        <div class="help-row"><span class="keys"><kbd>Delete</kbd> or <kbd>Backspace</kbd>, or the Delete button</span><span class="desc">Delete the selection.</span></div>
        <div class="help-row"><span class="keys"><kbd>Ctrl</kbd>+<kbd>C</kbd> / <kbd>X</kbd> / <kbd>V</kbd></span><span class="desc">Copy, cut, paste. Each paste is offset so repeats don't stack. A pasted group keeps its own joins but isn't joined to anything else.</span></div>
        <div class="help-row"><span class="keys"><kbd>Ctrl</kbd>+<kbd>Z</kbd>; <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> or <kbd>Ctrl</kbd>+<kbd>Y</kbd></span><span class="desc">Undo, redo: up to 50 steps. Specific buttons for this function are also in the header, top right of the screen. Undo works at any time, even mid-drag, where it cancels the drag.</span></div>
      </section>

      <section id="help-joins">
        <h3>How track joins</h3>
        <ul>
          <li>Two ends join when they meet: within 3&nbsp;mm and facing each other. A piece dropped into a gap joins at both ends, and track that only crosses or passes over other track is never joined.</li>
          <li>Green dots <span class="swatch dot" style="background:#3ddc84"></span>are open ends. While you drag, the end you're holding shows orange <span class="swatch dot" style="background:#ffb347"></span>and the end it will join shows red. <span class="swatch dot" style="background:#ff5a5a"></span></li>
          <li>Banked (superelevated) double-track curves join only other banked curves, and only as a continuing curve. Remember to use easement curves to return the banked curve to normal.</li>
          <li>Track Turntable Sections snap to the turntable's rim rather than to track ends.</li>
          <li>A piece joined to the top of a slope takes its height, so track built off the top stays elevated.</li>
        </ul>
      </section>

      <section id="help-gradient">
        <h3>Slopes &amp; Gradient Mode</h3>
        <p>Track is either on the ground or at KATO's 50&nbsp;mm elevated height, the height of its viaducts and bridges. A slope (gradient) climbs between the two across a run of pieces. KATO recommends 4% or gentler, and that's the planner's limit unless you choose another in ⚙️ Settings; a slope half as steep again (6% for 4%) or steeper shows a yellow warning triangle. A yellow triangle also marks tracks that cross with too little clearance: one must be the full 50&nbsp;mm above the other for a train to pass under, or both at the same height. Hover over it for the gap.</p>
        <div class="help-row"><span class="keys">▲ Gradient Mode, or <kbd>G</kbd></span><span class="desc">Open or close Gradient Mode. <kbd>Esc</kbd> also closes it.</span></div>
        <div class="help-row"><span class="keys">Click a straight, curve or double-track piece</span><span class="desc">Start a new slope there.</span></div>
        <div class="help-row"><span class="keys">Then click a piece further along the run</span><span class="desc">Extend the slope to it in one go. Clicking a piece already in the slope shortens it to end there. On a loop, where a piece can be reached both ways, a purple arrow chooses the direction first.</span></div>
        <div class="help-row"><span class="keys">Purple arrow, or <kbd>,</kbd> / <kbd>.</kbd></span><span class="desc">Add the next piece in that direction. The darker arrow, pointing back, removes the last one. <kbd>,</kbd> uses the arrow facing furthest left or up, <kbd>.</kbd> the one facing furthest right or down, so on a slope running left to right <kbd>.</kbd> adds and <kbd>,</kbd> removes.</span></div>
        <div class="help-row"><span class="keys"><kbd>Ctrl</kbd>+<kbd>Z</kbd></span><span class="desc">Remove the last piece.</span></div>
        <div class="help-row"><span class="keys">The tick, or <kbd>Enter</kbd></span><span class="desc">Confirm: the slope climbs from the ground to 50&nbsp;mm across the chosen pieces, or descends if it starts elevated.</span></div>
        <div class="help-row"><span class="keys">The red cross, or <kbd>Delete</kbd></span><span class="desc">Cancel the slope you're building and start again, staying in Gradient Mode. The cross sits on the slope's first piece, marking where it starts.</span></div>
        <div class="help-row"><span class="keys">Click an existing slope</span><span class="desc">See its length and gradient. The bin icon or <kbd>Delete</kbd> removes it.</span></div>
        <div class="help-row"><span class="keys">⬆️ Elevate Selection</span><span class="desc">Outside Gradient Mode, raise the selected pieces to 50&nbsp;mm, flat. Once they're all elevated, the button becomes Lower Selection and puts them back on the ground. Joins to track left at another height come apart; ends that meet track at the new height join it.</span></div>
        <p>While Gradient Mode is open, every slope is coloured by steepness: red is too steep, bright green is right at your limit (4% unless changed), darkening as it gets gentler. (The Colourblind Safe theme uses yellow and navy instead of green.) Turnouts and crossings can't be sloped, and two slopes need at least one flat piece between them. Other editing and marquee-select are off in Gradient Mode; panning and zooming still work.</p>
        <p>The Double Track Incline Track Straight 186mm (WS186PCINC) is placed already in a gradient. It will show the "too steep" warning until it is integrated into a proper slope.</p>
      </section>

      <section id="help-power-view">
        <h3>Power View</h3>
        <p>Power View is a rule of thumb for where your layout needs feeders. On Unitrack most of the power lost on the way to a train is lost at the joiners between pieces, so it counts joints rather than distance.</p>
        <div class="help-row"><span class="keys">⚡ Power View</span><span class="desc">Colour the track by how many joints it is from the nearest feeder track. Click again to turn it off. You can keep editing while it's on, but Gradient Mode is unavailable until you turn it off.</span></div>
        <div class="help-row"><span class="keys">Hover over a piece</span><span class="desc">See its count.</span></div>
        <div class="help-row"><span class="keys">Red at … joints</span><span class="desc">Set how many joints from a feeder count as too far.</span></div>
        <div class="help-row"><span class="keys">Misc. → Terminal UniJoiner (24-818)</span><span class="desc">A feeder that fits in a joint instead of a feeder track, for where there's no room for one. Drag it onto any track end, open or joined, and it sits on whichever side of the track you drop it (on double track, always the outer side); with a green end selected, clicking it fits it there. One per joint. Power View counts both pieces at that joint as fed; on double track it feeds only the track it's on.</span></div>
        <div class="help-row"><span class="keys">Unitram → Unitram Feeder (44-847)</span><span class="desc">The same as the Terminal UniJoiner, but it fits only Unitram track, which includes the conversion track. The Terminal and Insulated UniJoiners fit Unitram track too.</span></div>
        <div class="help-row"><span class="keys">Misc. → Insulated UniJoiner (24-816)</span><span class="desc">Stops power crossing a joint, to split the layout into separately fed sections. Drag it onto a joint between two pieces (not an open end); it sits across the track as a crossed-out ⚡. If either piece is dragged away, it's removed with the joint. Each counts as a pair, one per joint, so a pack of 20 fits ten joints; on double track it insulates only the track it's on. Power View stops counting at it.</span></div>
        <div class="help-row"><span class="keys">Drag a UniJoiner's ⚡</span><span class="desc">Move it to another joint or track end, or to the other side of the same one. Click it, then <kbd>Delete</kbd>, to remove it. If you drag away one of the two pieces at a Terminal UniJoiner's joint, it stays with the piece you left behind.</span></div>
        <p>Track is blue at a feeder and turns red as it nears 20 joints; past that, a feeder nearer that spot would help. For comparison, KATO's M2 set runs fine on its one feeder with its farthest track about 11 joints away. If your track needs feeders closer than that, or copes with them further apart, set your own number in the box under the button ("Red at … joints"); it's remembered in this browser. Joints are counted along the track either way round, so a loop fed at one point is fed from both sides. Leaving a turnout counts as 1.3 joints, for its internal contacts. KATO's turnouts are power-routing: a feeder before a turnout powers both of its routes, but a feeder on one route only powers back to the start of the turnout, so the other route shows as not powered unless something else feeds it. Dark track has no feeder at all. Double track is two separate tracks, so each track is coloured by its own distance, split down the middle of the piece; and the double crossover (WX310) passes no power across the insulated gap in its centre, which cuts both tracks and both diagonals, so each of its four quarters is coloured by its own distance from a feeder. It's a guide, not a voltage reading.</p>
      </section>

      <section id="help-tabletop">
        <h3>Tabletops</h3>
        <p>A tabletop marks out your real benchwork or floor space, so you can see what fits.</p>
        <div class="help-row"><span class="keys">Palette → Tabletop / Floorspace</span><span class="desc">Add a 250 × 250&nbsp;mm tabletop in the middle of the view.</span></div>
        <div class="help-row"><span class="keys">Drag it, or drag a corner</span><span class="desc">Move it, or resize it. It snaps to other tabletops' edges and corners.</span></div>
        <div class="help-row"><span class="keys">Click it, then a size label</span><span class="desc">Type an exact width or height, in millimetres or the inches chosen in ⚙️ Settings. <kbd>Enter</kbd> confirms, <kbd>Esc</kbd> cancels.</span></div>
        <div class="help-row"><span class="keys">Padlock</span><span class="desc">Lock it in place. A locked tabletop ignores the mouse, so you can work on track over it freely; click its padlock to unlock it.</span></div>
        <p>Tabletops that touch or overlap are drawn as one outline. A selected tabletop can be copied, cut, pasted and deleted like track.</p>
      </section>

      <section id="help-text-labels">
        <h3>Text labels</h3>
        <p>A text label puts your own words on the layout: a station name, a note, a direction.</p>
        <div class="help-row"><span class="keys">Palette → Text Label</span><span class="desc">Add a label in the middle of the view and start typing. <kbd>Enter</kbd> finishes, <kbd>Shift</kbd>+<kbd>Enter</kbd> starts a new line, <kbd>Esc</kbd> cancels.</span></div>
        <div class="help-row"><span class="keys">Double-click it, or <kbd>Enter</kbd> when selected</span><span class="desc">Edit the text. A label left empty is removed.</span></div>
        <div class="help-row"><span class="keys">Drag it</span><span class="desc">Move it. Scroll while dragging to turn it 15° per notch.</span></div>
        <div class="help-row"><span class="keys">Drag a corner</span><span class="desc">Make the text larger or smaller.</span></div>
        <div class="help-row"><span class="keys">Padlock</span><span class="desc">Lock it in place. A locked label ignores the mouse, so you can work on the track under it; click its padlock to unlock it.</span></div>
        <p>A selected label can be copied, cut, pasted and deleted like track. Labels are saved with the layout and appear on Export PNG.</p>
      </section>

      <section id="help-sets">
        <h3>Unitrack Sets</h3>
        <p>The Unitrack Sets group places a whole KATO track set, assembled as its real layout.</p>
        <div class="help-row"><span class="keys">Drag a set</span><span class="desc">Place it where you drop it. Scroll rotates it.</span></div>
        <div class="help-row"><span class="keys">Click a set</span><span class="desc">Place it in the middle of the view.</span></div>
        <p>A set lands as one selected group. It doesn't snap as it's placed; drag the group afterwards to join it to other track. Spare pieces that come in the set are placed beside it.</p>
      </section>

      <section id="help-special">
        <h3>Special pieces</h3>
        <ul>
          <li><strong>62&nbsp;mm bumpers</strong> (Types A and B) come on their own 62&nbsp;mm straight (S62), placed together and counted as one product.</li>
          <li><strong>Turntable:</strong> place Track Turntable Sections from Misc. around the pit. They snap to its rim, three tracks each, and selecting the turntable selects them too. The Fitted Connecting tracks join the sections' outer ends.</li>
          <li><strong>Island Platforms (23-171 PI-A, 23-172 PI-B, 23-173 C) and End A (23-174):</strong> 41&nbsp;mm wide, to fit between two tracks. A and B have a roof overhanging both; C has none. Drag one near a straight and it snaps flush to it, turning to match, and can be on either side of it; it joins other island pieces at either end (not one-sided platforms). The curved ends have a straight edge for a straight track and a curved one for a curve: PIE-2 and PIE-3 (23-175) for R718, PIE-4L and PIE-4R (23-176, 248&nbsp;mm) for R481; <kbd>F</kbd> swaps each pair.</li>
          <li><strong>One-sided Platforms (23-178 PS-A, 23-179 PS-B) and their ends (23-180, PSE-1 left and PSE-2 right):</strong> in Structures. The platforms have a 46&nbsp;mm roof that overhangs the track by 5&nbsp;mm; the ends are 200&nbsp;mm of plain 41&nbsp;mm slab with no roof. Drag one beside a straight (single or double track) and it snaps flush to the roadbed edge, parallel to the track, and slides freely along it; drag it away to unsnap. It snaps when it's turned within 30° of parallel, so turn it with the scroll wheel or <kbd>Q</kbd> / <kbd>E</kbd> first. Platforms have green ends of their own, which only other platforms join: drag one near the end of another (PS-A or PS-B, either end) and it snaps on, in line, as track does. PSE-1 only fits a platform's left end and PSE-2 its right; <kbd>F</kbd> turns one into the other. Clicking its palette button with a platform end selected attaches it there; otherwise it goes in the middle of the view. A platform stays on the ground whatever height the track beside it is.</li>
          <li><strong>Unitram Conversion Track (40-025 TWA124PC):</strong> in Unitram. A 124&nbsp;mm double-track piece whose tracks run 33&nbsp;mm apart (Unitrack) at one end and 25&nbsp;mm apart (Unitram street track) at the other, each moving 4&nbsp;mm in a gentle S-curve. Two come in a pack; turn one round to use it at the other end of a Unitram section.</li>
          <li><strong>Unitram Street Track Curves (40-103 TWR180L, 40-104 TWR180R):</strong> in Unitram. Double street track that starts 25&nbsp;mm apart and straight, then turns 45° on a centreline of R180, its tracks spreading to 33&nbsp;mm apart at the 45° end, so ordinary double track joins there. A left and a right also meet there, turning the street through 90° and leaving a 62&nbsp;mm square at the outside corner. Shift+scroll or F swaps left and right.</li>
          <li><strong>Unitram Street Electric Turnouts R180mm (40-212 TWEP180L left, 40-213 TWEP180R right):</strong> in Unitram. F or Shift+scroll swaps left and right. The street curve's plate, with both tracks also running straight on, 25&nbsp;mm apart, to a 186&nbsp;mm end. Each track can leave on its curved route to the 45° end, so the outer route crosses the other track. In Power View each track is a turnout of its own: fed from the end where the tracks start, power reaches both its routes; fed at a route's end, it reaches only that start.</li>
          <li><strong>Unitram Street 90° Crossing (40-301 TW-X90):</strong> in Unitram. A 62&nbsp;mm square where double street track crosses double street track, each track running straight through with its own power.</li>
          <li><strong>Road plates:</strong> drag one near a straight edge and it snaps flush against it, level with either end of that edge, keeping your rotation to the nearest quarter turn (scroll or Q and E turn it as you go). That covers other road plates, Unitram straights, the crossing, the conversion track, and the long edge and square ends of street curves and turnouts. A quarter plate joins other plates by its two straight sides only. No road plate snaps to ordinary Unitrack.</li>
          <li><strong>Unitram Quarter Circle Inner Road Plate (41-101):</strong> in Unitram. A road plate with no track that fills the inside of a 90° street corner made of a TWR180R and a TWR180L. Drag it near the inside of a street curve and it snaps into place, turned to fit. It stays on the ground and counts no track length.</li>
          <li><strong>Unitram Straight Road Plate 124mm:</strong> in Unitram. Only sold inside sets such as TV1, so it has no part code or catalogue number. It fills the space between quarter plates. Against a Unitram straight it goes on either side, level with either end, with its road towards the track.</li>
          <li><strong>Road Crossing Center Plate:</strong> in Unitram. A 62&nbsp;mm square road plate that comes with each R180 street curve, so it has no part code or catalogue number. It fills the notch at the outside of the corner two curves make.</li>
          <li><strong>Straight Road Plate w/Centerline - 62mm:</strong> in Unitram. A 62&nbsp;mm square of road with a hatched median and yellow centreline running through it, which carries on from one plate to the next. Only sold inside sets, so it has no part code or catalogue number.</li>
          <li><strong>Corner Road Plate w/Centerline:</strong> in Unitram. A road plate 186&nbsp;mm long and 62&nbsp;mm wide, with a crossing, a hatched median and a yellow centreline. Only sold inside sets, so it has no part code or catalogue number.</li>
          <li><strong>Corner Road Plate:</strong> in Unitram. A 186&nbsp;mm square road plate for the corner between straight street tracks, printed like the quarter circle plate. Only sold inside sets, so it has no part code or catalogue number.</li>
          <li><strong>Unitram Double Track Straights (40-033 TWS62, 40-024 TWS124, 40-014 TWS186):</strong> in Unitram. Street track with the two tracks 25&nbsp;mm apart, in a 62&nbsp;mm wide plate (a little wider than a double-track piece), with an edge strip of ordinary roadbed colour and a lighter paving with panel joints.</li>
          <li><strong>Beveled 60&nbsp;mm straights (S60L/R)</strong> are sold only with #4 turnouts, so they have no catalogue number of their own, and “Show as packs” buys them as part of a #4 turnout pack.</li>
        </ul>
      </section>

      <section id="help-limited">
        <h3>Limited Mode &amp; Inventory</h3>
        <p>Limited Mode limits you to only the track you own.</p>
        <div class="help-row"><span class="keys">📦 Inventory</span><span class="desc">Enter what you own: click the part number to add 1, or right-click it to subtract 1. You can also type the exact count, or add a whole pack or set by its catalogue number (e.g. 20-221). Save and Load keep your inventory as its own file, and <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd> undo inside the window. Confirm applies your changes; × discards them.</span></div>
        <div class="help-row"><span class="keys">Mode menu → Limited Mode</span><span class="desc">The palette shows how many of each piece you have left, and greys out any you have none left of. Anything that would go over is refused, and the green panel says why. Pieces that are placed beyond what you own, for example after loading a layout, or from switching from Free Mode into Limited Mode, are drawn red.</span></div>
        <p>Choosing Limited Mode with an empty inventory opens the Inventory window; closing it with nothing owned returns to Free Mode, where every piece is available.</p>
      </section>

      <section id="help-parts">
        <h3>Parts list &amp; buying</h3>
        <div class="help-row"><span class="keys">Export PNG</span><span class="desc">A picture of the whole layout (or, with some pieces selected, Export Selected as PNG: just those): each piece's outline, with its part code beside it. Each slope has a dashed line along its middle, with its height at each end and its gradient and length halfway; track passing under higher track shows dashed where it's covered. It opens as a preview; Save PNG downloads it (up to 4000 pixels on its longer side).</span></div>
        <div class="help-row"><span class="keys">Export Parts List</span><span class="desc">List every KATO product in the layout with its catalogue number. With pieces selected, it lists only the selection.</span></div>
        <div class="help-row"><span class="keys">Export as CSV</span><span class="desc">Save the list as a spreadsheet file.</span></div>
        <div class="help-row"><span class="keys">Show as packs</span><span class="desc">The fewest KATO packs that cover the list. Turnouts and other kits are bought only for their main piece; the rest of the box counts towards the list. Spares are listed, and packs whose contents aren't yet confirmed are marked ⚠. Track sets are bought only when they're the only source of a piece (V12's concrete viaducts); a set that your layout would use at least 80% of is suggested underneath instead, with how many packs it would replace.</span></div>
        <p>The list counts products, not placed pieces: a 62&nbsp;mm bumper and its straight are one item.</p>
      </section>

      <section id="help-files">
        <h3>Files &amp; settings</h3>
        <div class="help-row"><span class="keys">💾 Save, or <kbd>Ctrl</kbd>+<kbd>S</kbd></span><span class="desc">Download the layout as a file.</span></div>
        <div class="help-row"><span class="keys">📂 Load, or <kbd>Ctrl</kbd>+<kbd>O</kbd></span><span class="desc">Open a saved layout. Unknown pieces are skipped and counted; files from a newer version of the planner are refused.</span></div>
        <div class="help-row"><span class="keys">🆕 New</span><span class="desc">Start an empty layout. It asks first.</span></div>
        <div class="help-row"><span class="keys">⚙️ Settings: theme</span><span class="desc">Default, Light, or Colourblind Safe, which changes only the gradient colours. Track looks the same in every theme, as the real pieces do.</span></div>
        <div class="help-row"><span class="keys">⚙️ Settings: language</span><span class="desc">The planner's language.</span></div>
        <div class="help-row"><span class="keys">⚙️ Settings: units</span><span class="desc">Millimetres or inches for the lengths and sizes the planner shows: track length, footprint, tabletops, slope runs. Piece names and KATO's 50&nbsp;mm height stay in millimetres, and saved files are the same either way.</span></div>
        <div class="help-row"><span class="keys">⚙️ Settings: arrow key steps</span><span class="desc">How far the arrow keys move the selection, alone, with <kbd>Shift</kbd> and with <kbd>Ctrl</kbd>. They start at 33&nbsp;mm, 165&nbsp;mm and 3&nbsp;mm, and ↺ beside each puts its default back.</span></div>
        <div class="help-row"><span class="keys">⚙️ Settings: steepest slope</span><span class="desc">The slope limit Gradient Mode colours against: 2%, 3%, 4% (KATO's standard) or 5%. The warning triangle appears at half as steep again.</span></div>
        <div class="help-row"><span class="keys">⚙️ Settings: hide detail</span><span class="desc">When ties, green dots and orange arrows hide as you zoom out: sooner, normal, later, or never.</span></div>
        <div class="help-row"><span class="keys">⚙️ Settings: autosave</span><span class="desc">Turn the browser autosave on or off. Turning it off deletes the saved copy.</span></div>
        <div class="help-row"><span class="keys">⚙️ Settings: forget everything</span><span class="desc">Delete everything the planner keeps in this browser (the autosaved layout, your inventory and every setting) and start afresh. It asks first. Saved layout files aren't touched.</span></div>
        <div class="help-row"><span class="keys">⚙️ Settings: track colours</span><span class="desc">Your own colours for the roadbed, level track above the ground, the bottom and top of a slope, Power View's two ends, and selected pieces. ↺ beside each puts its default back.</span></div>
        <p>The planner also autosaves to this browser as you work and restores it next time, unless you turn that off in ⚙️ Settings. It's a safety net, not a substitute for saving: clearing your browser's data removes it. Your inventory is kept separately from layouts.</p>
      </section>

      <section id="help-keys">
        <h3>Keyboard shortcuts</h3>
        <div class="help-row"><span class="keys"><kbd>,</kbd> / <kbd>.</kbd></span><span class="desc">Extend the selection from its end facing left or up / right or down; in Gradient Mode, the slope; in a Fill Gap preview, the previous / next fill. (The same keys as <kbd>&lt;</kbd> / <kbd>&gt;</kbd>.)</span></div>
        <div class="help-row"><span class="keys"><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd></span><span class="desc">Pan (hold). Also works while dragging, to carry a piece beyond the edge of the view.</span></div>
        <div class="help-row"><span class="keys"><kbd>+</kbd> / <kbd>−</kbd></span><span class="desc">Zoom in / out.</span></div>
        <div class="help-row"><span class="keys"><kbd>Space</kbd></span><span class="desc">Fit the whole layout in view (the ↺ button). With the crosshair on, select or deselect the piece under it; hold and pan to do the same to everything it crosses.</span></div>
        <div class="help-row"><span class="keys"><kbd>Shift</kbd> (tap)</span><span class="desc">Turn the selection crosshair on or off. With it on, <kbd>Ctrl</kbd> (tap) starts and ends a selection box.</span></div>
        <div class="help-row"><span class="keys"><kbd>V</kbd></span><span class="desc">Next level focus: every level, ground level, elevated track, and round again (the ↕ ↓ ↑ buttons).</span></div>
        <div class="help-row"><span class="keys"><kbd>0</kbd>–<kbd>9</kbd></span><span class="desc">Start a palette search with that number; carry on typing the rest of it.</span></div>
        <div class="help-row"><span class="keys"><kbd>T</kbd></span><span class="desc">Toggle detail (ties and slab detail).</span></div>
        <div class="help-row"><span class="keys"><kbd>L</kbd></span><span class="desc">Cycle the part labels: Off, Limited, Printed, All.</span></div>
        <div class="help-row"><span class="keys"><kbd>P</kbd></span><span class="desc">Show or hide the green dots and orange arrows.</span></div>
        <div class="help-row"><span class="keys"><kbd>Q</kbd> / <kbd>E</kbd></span><span class="desc">Turn the selection, or the piece, set or label being held, 15° anticlockwise / clockwise. Joins to pieces outside the selection break, as when dragging.</span></div>
        <div class="help-row"><span class="keys">Arrow keys</span><span class="desc">Move the selection 33&nbsp;mm; with <kbd>Shift</kbd> 165&nbsp;mm, with <kbd>Ctrl</kbd> 3&nbsp;mm (change them in ⚙️ Settings). Joins to pieces outside the selection break, and it snaps to any end the step brings within range.</span></div>
        <div class="help-row"><span class="keys"><kbd>F</kbd></span><span class="desc">Flip the selected or held piece.</span></div>
        <div class="help-row"><span class="keys"><kbd>G</kbd></span><span class="desc">Open or close Gradient Mode.</span></div>
        <div class="help-row"><span class="keys"><kbd>J</kbd></span><span class="desc">Fill the gap from the selected green dot to the nearest open end it can reach.</span></div>
        <div class="help-row"><span class="keys"><kbd>Delete</kbd> or <kbd>Backspace</kbd></span><span class="desc">Delete the selection; in Gradient Mode, cancel the slope being built, or delete the selected slope.</span></div>
        <div class="help-row"><span class="keys"><kbd>Esc</kbd></span><span class="desc">Cancel a crosshair selection box, or turn the crosshair off. Otherwise deselect, leave Gradient Mode, or close a window. With nothing to deselect, clear the palette search.</span></div>
        <div class="help-row"><span class="keys"><kbd>Enter</kbd></span><span class="desc">Confirm a slope, a typed size, or a question; edit a selected text label.</span></div>
        <div class="help-row"><span class="keys"><kbd>Ctrl</kbd>+<kbd>S</kbd></span><span class="desc">Save the layout (as the 💾 Save button).</span></div>
        <div class="help-row"><span class="keys"><kbd>Ctrl</kbd>+<kbd>O</kbd></span><span class="desc">Load a layout (as the 📂 Load button).</span></div>
        <div class="help-row"><span class="keys"><kbd>Ctrl</kbd>+<kbd>A</kbd></span><span class="desc">Select every piece.</span></div>
        <div class="help-row"><span class="keys"><kbd>Ctrl</kbd>+<kbd>C</kbd> / <kbd>X</kbd> / <kbd>V</kbd></span><span class="desc">Copy, cut, paste.</span></div>
        <div class="help-row"><span class="keys"><kbd>Ctrl</kbd>+<kbd>Z</kbd></span><span class="desc">Undo; in Gradient Mode, remove the slope's last piece.</span></div>
        <div class="help-row"><span class="keys"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>, <kbd>Ctrl</kbd>+<kbd>Y</kbd></span><span class="desc">Redo.</span></div>
        <p>On a Mac, use <kbd>Cmd</kbd> for <kbd>Ctrl</kbd>. Shortcuts don't act while you're typing in a text box. The view keys (zoom, <kbd>Space</kbd>, <kbd>V</kbd>, <kbd>T</kbd>, <kbd>L</kbd>, <kbd>P</kbd>) and the number keys also work in Gradient Mode and while choosing a Fill Gap.</p>
      </section>

      <section id="help-about">
        <h3>About</h3>
        <p>Floor Layout Planner is a free, independent tool for planning N-scale Unitrack layouts. It is not made by, affiliated with or endorsed by KATO. KATO and Unitrack are trademarks of their owners and are used here only to say which track the planner is for. Part numbers and dimensions are published facts; check them against KATO's own catalogue before you buy. The planner is free to use and share for non-commercial purposes under the PolyForm Noncommercial License 1.0.0, and comes as it is, with no warranty and no promise of support.</p>
      </section>

      </div>
    </div>`,

    'dialog.cancel': 'Cancel',
    'dialog.ok.default': 'OK',

    'palette.search.placeholder': 'Search pieces or codes\u2026',
    'palette.search.clear.title': 'Clear search',
    'palette.noMatches': 'No matching pieces.',
    'palette.group.straights': 'Straights',
    'palette.group.straightsConcrete': 'Straights (Concrete Tie)',
    'palette.group.curves': 'Curves',
    'palette.group.curvesConcrete': 'Curves (Concrete Tie)',
    'palette.group.turnouts': 'Turnouts',
    'palette.group.crossings': 'Crossings',
    'palette.group.dstraights': 'Double Straights',
    'palette.group.dstraightsSlab': 'Double Straights (Slab)',
    'palette.group.dcurves': 'Double Curves',
    'palette.group.dcurvesSlab': 'Double Curves (Slab)',
    'palette.group.viaducts': 'Viaducts',
    'palette.group.viaductsConcrete': 'Viaducts (Concrete Tie / V12)',
    'palette.group.bridges': 'Bridges',
    'palette.group.buffers': 'Buffers',
    'palette.group.buffersConcrete': 'Buffers (Concrete Tie)',
    'palette.group.structures': 'Structures',
    'palette.group.unitram': 'Unitram',
    'palette.group.misc': 'Misc.',
    'palette.group.sets': 'Unitrack Sets',
    'palette.group.layouts': 'Layouts',
    'palette.group.collapseHint.expand': 'Click to expand',
    'palette.group.collapseHint.collapse': 'Click to collapse',
    'palette.tabletop.label': (w,h) => `Tabletop / Floorspace<span class="code">${w}&times;${h}</span>`,
    'palette.textLabel.label': 'Text Label<span class="code">Free text on the layout</span>',
    'selection.textLabel': size => `Text Label<span class="code">${size} text</span>`,
    'hint.textSelected': 'Text label selected. Drag it to move it (scroll while dragging turns it 15° a notch), drag a corner to change the text size, double-click or press Enter to edit the text, or click the padlock to fix it in place. Delete removes it; Ctrl+C, Ctrl+X and Ctrl+V copy, cut and paste it.',
    'hover.p8': 'Click to add a text label in the middle of the view, then type. Enter finishes; Shift+Enter starts a new line.',
    'hover.x1': 'Drag to move this label; scroll while dragging turns it. Double-click to edit the text. Click to select it, then drag a corner to change its size.',
    'hover.x2': 'Drag to make the text larger or smaller.',
    'hover.x3': 'Click to lock this label in place. A locked label ignores the mouse, so the track under it can be picked and dragged freely.',
    'hover.x4': 'Click to unlock this label so it can be moved, edited or deleted again.',

    'canvas.viewAllLevels.title': 'View all levels',
    'canvas.focusGround.title': 'Focus ground level',
    'canvas.focusElevated.title': 'Focus elevated level',
    'canvas.ties.title': 'Toggle detail',
    'canvas.ports.title': 'Toggle open ports and extend arrows',
    'canvas.partLabels.title': mode => `Part labels: ${({off:'Off', limited:'Limited', printed:'Printed', all:'All'})[mode] || 'Limited'}`,
    'gapfill.btn': '\u{1F9E9} Fill Gap',
    'gapfill.btn.cancel': '✗ Cancel Fill Gap',
    'png.btn': 'Export PNG',
    'png.btn.selection': 'Export Selected as PNG',
    'png.title': 'Export PNG',
    'png.title.selection': 'Export Selected as PNG',
    'png.save': 'Save PNG',
    'png.size': (w, h) => `${w} × ${h} px`,
    'png.slope': (pct, run) => `Slope ${pct}% · ${run}`,
    'power.btn': '⚡ Power View',
    'power.btn.exit': '✗ Exit Power View',
    'hover.b15': limit => `Colours the track by how many joints it is from the nearest feeder, a rule of thumb for where power fades: on Unitrack most of the loss is at the joiners. Blue at a feeder, red at ${limit} joints or more (set your own under the button; leaving a turnout counts 1.3); dark track has no feeder at all. Not a voltage reading.`,
    // The joints box (#powerLimit) is filled in by renderSelection.
    'power.legend': (ramp, none, turnout) => `<div style="display:flex; justify-content:space-between; align-items:center; font-size:11px;"><span>Feeder</span>`
      + `<label style="display:flex; align-items:center; gap:4px;" data-hint="w2">Red at <input id="powerLimit" type="number" min="1" max="999" step="1" style="width:46px; font:inherit; color:var(--text); background:var(--surface-sunken); border:1px solid var(--panel-border); border-radius:4px; padding:1px 3px;"> joints</label></div>`
      + `<div style="height:8px; border-radius:4px; background:${ramp}; margin:2px 0 6px;"></div>`
      + `<div style="display:flex; align-items:center; gap:6px; font-size:11px;"><span style="width:14px; height:8px; border-radius:2px; background:${none}; border:1px solid var(--panel-border);"></span>Not powered</div>`
      + `<div style="font-size:11px; margin-top:6px;">Joints counted from the nearest feeder either way round; leaving a turnout counts ${turnout}. A rule of thumb, not a voltage.</div>`,
    // `split`: the two counts of a double-track piece's tracks, or (`block`)
    // a WX310's halves either side of its gap.
    'hover.w1': (joints, limit, feeder, split, block) => feeder ? 'A feeder: power enters the track here.'
      : split ? (()=>{
          const part = h=>isFinite(h) ? `is ${formatJoints(h)} joint${h===1 ? '' : 's'} from the nearest feeder` : 'has no feeder reaching it';
          // A WX310's quarters, by count: "1, 2.3 and 4 joints, and one with no feeder".
          const quarters = ()=>{
            const fed = split.filter(isFinite).sort((x, y)=>x-y), unfed = split.length - fed.length;
            const nums = fed.map(formatJoints), list = nums.length>1 ? nums.slice(0, -1).join(', ') + ' and ' + nums[nums.length-1] : nums[0];
            return (fed.length ? `${list} joint${fed.length===1 && fed[0]===1 ? '' : 's'} from the nearest feeder` : '')
              + (unfed ? `${fed.length ? ', and ' : ''}${unfed===split.length ? 'none of them reached by a feeder' : `${['', 'one', 'two', 'three'][unfed]} with no feeder reaching ${unfed===1 ? 'it' : 'them'}`}` : '');
          };
          return block
            ? `Its insulated centre gap cuts both tracks and both diagonals, so each of its four quarters (one end of one track) is counted on its own: ${quarters()}.`
            : split[0]===split[1] ? (isFinite(split[0]) ? `Both tracks are ${formatJoints(split[0])} joint${split[0]===1 ? '' : 's'} from the nearest feeder.` : 'No feeder reaches either track.')
            : `Its two tracks are separate, so each is counted on its own: one track ${part(split[0])}, and the other ${part(split[1])}.`;
        })()
      : !isFinite(joints) ? 'No feeder reaches this piece. Add one, or join this track to track that has one.'
      : `${formatJoints(joints)} joint${joints===1 ? '' : 's'} from the nearest feeder${joints>=limit ? `, past the ${limit}-joint guide: a feeder nearer here would help` : ''}.`,
    'hover.w2': def => `How many joints from a feeder count as too far: track that far out or further is red. ${def} by default; KATO's M2 set runs fine on its one feeder with its farthest track about 11 joints away. Remembered in this browser.`,
    'elevate.btn': '⬆️ Elevate Selection',
    'elevate.btn.lower': '⬇️ Lower Selection',
    'hover.b14': lower => lower
      ? 'Lowers the selected pieces to the ground, flat. Joins to track left at another height come apart.'
      : 'Raises the selected pieces to the 50mm elevated level, flat (a mixed selection all goes up). Once they\'re all elevated, this button lowers them again. Joins to track left at another height come apart.',
    'hover.b13': 'Makes a picture of the layout: each piece\'s outline with its part code beside it. It opens as a preview first; Save PNG downloads it.',
    'canvas.zoomOut.title': 'Zoom out',
    'canvas.zoomIn.title': 'Zoom in',
    'canvas.zoomReset.title': 'Reset view',

    'panel.layout.heading': 'Layout',
    'panel.selection.heading': 'Selection',
    'panel.gradient.heading': 'Gradient',
    'stat.pieces.label': 'Pieces',
    'stat.length.label': 'Track length',
    'stat.footprint.label': 'Footprint',
    'stat.footprint.empty': '&mdash;',

    'selection.none': 'Nothing selected',
    'selection.delete': '\u{1F5D1}️ Delete',
    'parts.btn.layout': 'Export Parts List',
    'parts.btn.selection': 'Export Selected as List',
    'parts.title.layout': 'Parts list',
    'parts.title.selection': 'Parts list \u2014 selection',
    'parts.col.qty': 'Qty',
    'parts.col.part': 'Part',
    'parts.col.catalogNo': 'Cat. no.',
    'parts.col.description': 'Description',
    'parts.total': 'Total',
    'parts.csv': 'Export as CSV',
    'parts.packs': 'Show as packs',
    'packs.title': 'Packs to buy',
    'packs.back': '&larr; Parts list',
    'packs.note': 'The fewest KATO packs that cover the list. Turnouts and other kits are only bought for their main piece; what else comes in the box counts towards the rest.',
    'packs.col.qty': 'Qty',
    'packs.col.catalogNo': 'Cat. no.',
    'packs.col.contents': 'Contents',
    'packs.col.check': 'Unconfirmed',
    'packs.unconfirmed': 'Pack contents not yet confirmed',
    'packs.notSold': 'not sold separately',
    'packs.spare': list => `Spare pieces: ${list}`,
    'packs.noSpare': 'No spare pieces.',
    // A set that suits the layout (setSuggestions); the list above is unchanged.
    'packs.setFit': (name, no, used, spare, replaces) => `Worth considering: <b>${name}</b> (${no}) would cover ${used} of these pieces${spare ? `, leaving ${spare} spare` : ''}, in place of ${replaces} ${replaces===1 ? 'pack' : 'packs'} above.`,
    'packs.csv.filename': 'kato-packs',
    'parts.csv.filename': 'kato-parts',
    'selection.openPort': (label,code) => `Open port on ${label}<span class="code">${code}</span>`,
    'selection.piece': (label,code) => `${label}<span class="code">${code}</span>`,
    'selection.groupCount': (code,count) => `<div class="sel-row"><span class="code">${code}</span><span class="sel-count">\u00d7${count}</span></div>`,
    'selection.piecesCount': (n,lengthHtml,rowsHtml) => `<div class="sel-summary">${n} pieces selected</div>${lengthHtml}<div class="sel-list">${rowsHtml}</div>`,
    'selection.length': (label,len) => `<div class="stat sel-length"><span>${label}</span><span>${len}</span></div>`,
    'selection.tabletop': (w,h) => `Tabletop / Floorspace<span class="code">${w}\u00d7${h}</span>`,

    'hint.default': 'Drag a piece from the left panel onto the layout to place it freely, click one to drop it in the middle of the view, or click a green port then click a piece to attach it there.',
    'empty.start': 'To start, click on or drag a piece from the palette to the left, or select a Unitrack Set or layout below.',
    // Hover hints: what the pointer is over, or the action under way.
    // Functions take (canMutate, canFlip) where the hint names Shift+scroll or F.
    'hover.c1': 'Drag empty space to pan, or use W A S D. Scroll to zoom. Right click for marquee selection (Shift+right-drag adds to the selection). Ctrl+A selects everything.',
    'hover.c2': 'Click to select this piece. Shift+click to add to current selection. Double-click selects everything connected to it.',
    'hover.c3': (mut, flip) => `Drag to move it. While dragging, scroll rotates it 15\u00b0 per notch${mut ? ', Shift+scroll swaps it for a related size' : ''}${flip ? ' and F flips it' : ''}. The orange arrows, or , and . (the < and > keys), extend the selection. Delete removes it; Ctrl+C, Ctrl+X and Ctrl+V copy, cut and paste it.`,
    'hover.c4': 'Drag to move the whole selection. Shift+click removes piece from selection; Delete removes them all. Ctrl+C, Ctrl+X and Ctrl+V copy, cut and paste the group.',
    'hover.c5': 'Click to select this port, then click a piece in the left panel to attach it here. Double-click port to duplicate its piece.',
    'hover.c6': 'Click a piece in the left panel to attach it here, or double-click this port to add another of the same piece. Shift+click another green end, or press J, to fill the gap to it. Click empty canvas or press Esc to deselect it.',
    'hover.c7': 'Click to flood-select in this direction. (, triggers the arrow facing furthest left or up, . the one facing furthest right or down.)',
    'hover.c8': 'Place Track Turntable Sections from the Misc. group around the pit; they snap to its rim and each carries three tracks. Selecting the turntable selects any attached sections too.',
    'hover.c9': () => `This slope climbs at ${gradientRedPct}% or steeper; ideal is ${gradientTargetPct}% or less. Press G to open Gradient Mode, where you can inspect it or delete and rebuild it.`,
    'hover.c10': 'You do not currently own this piece according to \ud83d\udce6 Inventory.',
    'hover.c11': 'These tracks cross with too little clearance: one needs to be the full 50mm above the other for a train to pass under, or at the same height. Adjust the gradient in Gradient Mode (G), or move one of them.',
    'hover.t1': 'Drag to move this tabletop, or drag a corner to resize it. Click to select it; size labels will appear, in which you can type an exact measurement in millimetres. Once selected, Ctrl+C, Ctrl+X and Delete work on it.',
    'hover.t2': 'Drag to resize the tabletop from this corner.',
    'hover.t3': 'Click to type an exact size in millimetres. Enter confirms and Esc cancels.',
    'hover.t4': 'Click to lock this tabletop in place. A locked tabletop ignores the mouse, so pieces on top of it can be picked and dragged freely.',
    'hover.t5': 'Click to unlock this tabletop so it can be moved, resized or deleted again.',
    'hover.g1': 'Click to start a new gradient here, then click the piece where it should end (or extend it one piece at a time with the purple arrows, or , and .). The tick icon or Enter confirms it. Ctrl+Z removes the last added piece.',
    'hover.g2': "Click to see this slope's length and gradient, and to delete it with the bin icon or the Delete key. G or Escape leaves Gradient Mode.",
    'hover.g3': "Turnouts and crossings can't be graded. Start from a straight, curve or double-track piece instead.",
    'hover.g4': 'Click to add the next piece in this direction. (, triggers the arrow facing furthest left or up, . the one facing furthest right or down.)',
    'hover.g5': 'Click to take the last piece off the gradient. Ctrl+Z, or whichever of , and . points the same way, does the same.',
    'hover.g6': 'Click to confirm this gradient, or press Enter. It climbs from ground level to the 50mm elevated height across the pieces chosen.',
    'hover.g7': 'Click to delete this gradient. The Delete key does the same.',
    'hover.g8': 'Click to extend the gradient to this piece. (The purple arrows still add one piece at a time.)',
    'hover.g9': 'Click to shorten the gradient so it ends at this piece.',
    'hover.g10': 'This piece can be reached both ways round the loop. Use a purple arrow first to choose the direction, then click it.',
    'hover.g11': 'Click to cancel this gradient and start again, or press Delete. You stay in Gradient Mode.',
    'hover.p1': (mut, flip) => `Drag onto the layout to place this piece; it snaps to nearby green ports. While dragging, scroll rotates it${mut ? ', Shift+scroll swaps its size' : ''}${flip ? ' and F flips it' : ''}.`,
    'hover.p2': 'Click to attach this piece to the selected port, or drag it anywhere on the layout.',
    'hover.p3': 'None of this piece left in your inventory. Delete placed ones to free some up, add more in \ud83d\udce6 Inventory, or switch to Free Mode.',
    'hover.p4': 'Click to add a tabletop marking out your benchwork. Resize it to match your real surface area so you can see what fits.',
    'hover.p5': 'Click to collapse or expand this group; right-click to collapse every group (or expand them all if they already are). The search box above finds pieces by name, catalogue number or part code.',
    'hover.b1': '\u2193 fades the elevated track so you can work on ground level, \u2191 does the reverse, and \u2195 shows every level at full opacity.',
    'hover.b2': 'Zoom out, zoom in, or \u21ba to reset the view; the number between shows the current zoom. Scrolling over empty canvas zooms too.',
    'hover.b3': 'Deletes the selection. The Delete key does the same.',
    'hover.b4': 'Build and check slopes up to the 50mm elevated level. G opens and closes it from anywhere.',
    'hover.b5': 'Lists the pieces in the layout, or just the selection, with catalogue numbers. \u201cShow as packs\u201d gives the fewest KATO packs that will match the selection.',
    'hover.b6': 'Ctrl+Z undoes, and Ctrl+Shift+Z or Ctrl+Y redoes, up to 50 steps.',
    'hover.b7': 'Free Mode has unlimited piece placement. Limited Mode only lets you place pieces you own, set in \ud83d\udce6 Inventory.',
    // Functions so they read the *_AUTO_HIDE_BELOW constants when shown (they're declared further down).
    'hover.b9': () => `Shows or hides track detail, like ties (sleepers). Hiding them makes the joins between pieces easier to see from a distance. ${zoomHideText(tiesView)}`,
    'hover.b10': () => `Shows or hides the green open-port dots and the orange extend arrows on a selection. ${zoomHideText(portsView)} The selected port and snap highlights always show, and , and . still extend a selection.`,
    'hover.b12': 'Fill a gap. With a green end selected, finds runs of up to 6 pieces joining it to the nearest end they can reach; in Limited Mode, only from pieces you have spare. Or Shift+click the other end to choose it yourself. Shortcut: J.',
    'hover.gapFill': (i, n, parts, play, pct) => `Fill ${i} of ${n}: ${parts}${play ? ` (needs ${play} of joiner play)` : ' (fits exactly)'}${pct ? `, graded at ${pct}%` : ''}. Scroll, or press , and ., for the others. Enter, or a click on the preview, places it; Esc or a click elsewhere cancels.`,
    'gapfill.needEnd': 'Select an open end (a green dot) first, then press J or Fill Gap in the side panel. Or Shift+click a second end to fill the gap between the two.',
    'gapfill.badEnd': 'Fill gap joins single track. It can\'t start or finish at double track, a turntable part or a banked curve\'s end.',
    'gapfill.slopeEnd': 'Fill Gap attempt failed. Slope rule: these ends would result in a gradient joined straight onto another gradient. At least one flat piece is required between two gradients.',
    'gapfill.failed': 'Fill Gap attempt failed.',
    // Why (gapFillFailed): `near` when the ends were the nearest to the selected one.
    'gapfill.why.cross': (max, near) => `Blocked: fills exist${near ? ' to an open end nearby' : ''}, but every one runs through track on the same level.`,
    'gapfill.why.stock': (max, near) => `Limited Mode, stock: fills exist${near ? ' to an open end nearby' : ''}, but none can be built from your spare pieces.`,
    'gapfill.why.slope': () => 'Slope rule: the open ends nearby would result in a gradient joined straight onto another gradient. At least one flat piece is required between two gradients.',
    'gapfill.why.reach': (max, near) => `Physically impossible: no combination of up to ${max} pieces lands on ${near ? 'an open end nearby' : 'the other end'}, even allowing for joiner play.`,
    'hover.b11': mode => {
      const now = {off:'Off: no part labels.', printed:'Printed: every piece has its part code printed on it, like the S64, growing and shrinking with the track.', all:'All: every piece shows its part code, sized to stay readable as you zoom.'}[mode]
        || 'Limited: labels only on pieces easily mistaken for a similar one, such as the S64 and the S60s.';
      return `Part labels. ${now} Click for ${({off:'Limited', limited:'Printed', printed:'All', all:'Off'})[mode] || 'Printed'}.`;
    },
    'hover.b8': 'Enter the track you actually own, piece by piece or a whole pack at a time. Limited Mode counts from it.',
    'hover.a1': (mut, flip) => `Scroll to rotate 15\u00b0 per notch${mut ? ', Shift+scroll to swap size' : ''}${flip ? ', F to flip' : ''}. Drop near a green port to snap it on; dragging it across a join breaks that join. Ctrl+Z cancels the drag.`,
    'hover.a2': (mut, flip) => `Drop on the layout to place it; near a green port it snaps on. Scroll rotates${mut ? ', Shift+scroll swaps size' : ''}${flip ? ', F flips' : ''}. Drop it back on the panel to cancel.`,
    'hover.p6': 'Drag onto the layout to place the whole set, or click to drop it in the middle of the view. Scroll while dragging rotates it 15\u00b0 per notch.',
    'hover.p7': 'Click to start from this layout. It lands in the middle of the view, and the view zooms to fit it.',
    'hover.p10': 'Drag onto a track end or a joint to feed power in there. With a green track end selected, a click fits it there.',
    'hover.j1': 'A feeder: power enters the track at this joint. Drag it to another joint or track end, or click it and press Delete to remove it.',
    'hover.p11': 'Drag onto a joint to stop power crossing it. One counts per joint: a pack of 20 fits ten.',
    'hint.insulatedHow': 'Drag the Insulated UniJoiner onto a joint between two pieces.',
    'hover.j2': 'An Insulated UniJoiner: power doesn\u2019t cross this joint. Drag it to another joint or track end, or click it and press Delete to remove it.',
    'hint.feederWrongTrack': name => `The ${name} only fits Unitram track. On Unitrack, use the Terminal UniJoiner.`,
    'hint.joinerHow': name => `Drag the ${name} onto a track end or a joint, or select a green track end first.`,
    'hover.p9': 'Short animations of the drag, scroll and click gestures that aren’t obvious at first.',
    'hover.a4': 'Drop on the layout to place the whole set. Scroll rotates it 15\u00b0 per notch. Drop it back on the panel to cancel.',
    'hover.a3': 'Release to select everything inside the box. Hold Shift as you start to add to the current selection instead.',
    'hint.tabletopSelected': 'Tabletop selected. Drag its body to move it, drag a corner to resize it, or click the padlock to fix it in place. Delete removes it; Ctrl+C, Ctrl+X and Ctrl+V copy, cut and paste it.',

    'gradient.modeBtn.start': '&#9650; Gradient Mode',
    'gradient.modeBtn.exit': '&#10007; Exit Gradient Mode',
    'gradient.blockedByPower': 'Gradient Mode is off while Power View is on. Exit Power View first.',
    'gradient.info.default': 'Mark an existing run of track as a slope up to the standard 50mm elevated height.',
    'gradient.info.idleExisting': () => `Every existing gradient is shown (red = too steep, bright green = right at ${slopeLimitText()}, deepening to dark green as it gets gentler still). Click one for its details and the option to delete it, or click a straight, curve, or double-track piece to start a new one.`,
    'gradient.info.idleExisting.colourblind': () => `Every existing gradient is shown (red = too steep, bright yellow = right at ${slopeLimitText()}, deepening to dark navy as it gets gentler still). Click one for its details and the option to delete it, or click a straight, curve, or double-track piece to start a new one.`,
    'gradient.info.chain': (n,run,pctText) => `${n} piece${n===1?'':'s'} &middot; ${run} run &middot; <strong>${pctText}</strong> gradient (0&rarr;50mm)<br>Click a piece further along (or a purple arrow) to extend, or a piece in the gradient to end it there. Tick to confirm, cross (or Delete) to cancel; Ctrl+Z or the reverse arrow removes the last piece.`,
    'gradient.info.selected': (n,run,pctText) => `${n} piece${n===1?'':'s'} &middot; ${run} run &middot; <strong>${pctText}</strong> gradient (0&rarr;50mm)<br>Click the delete icon to remove it, or click elsewhere to deselect.`,
    'gradient.info.notGradeable': "Turnouts and crossings can't be graded \u2014 pick a straight, curve, or double-track section to start.",
    'gradient.info.adjacentToExisting': "That piece is right next to an existing gradient \u2014 leave at least one flat piece between climbs, or start further away.",
    'gradient.info.noPath': "The gradient can't reach that piece: the run between is broken by a turnout or crossing, another gradient, or a gap. Pick a piece further along the same run.",
    'gradient.info.bothWays': "That piece can be reached both ways round the loop. Use a purple arrow to choose the direction first, then click it.",
    'gradient.steepWarning.title': pct => `Steep gradient \u2014 at or past ${pct}%`,
    'clearance.warning.title': (gap, need) => `Too little clearance — ${gap} between these tracks (${need} needed)`,

    'confirm.newLayout.message': 'Start a new layout? This clears everything currently on the canvas (save first if you want to keep it).',
    'confirm.newLayout.confirmLabel': 'Start new layout',

    'msg.autosaved': 'Autosaved',
    'msg.autosaveUnavailable': 'Autosave unavailable in this browser',
    'msg.newLayoutStarted': 'New layout started',
    'msg.saved': n => `Saved (${n} pieces)`,
    'msg.saveFailed': err => `Save failed: ${err}`,
    'msg.saveFailed.unknown': 'unknown error',
    'msg.loaded': n => `Loaded (${n} pieces)`,
    'msg.loadedWithSkipped': (n,skipped) => `Loaded (${n} pieces, ${skipped} skipped)`,
    'msg.loadFailed.badJson': 'Load failed: not valid JSON',
    'msg.loadFailed.reason': reason => `Load failed: ${reason}`,
    'msg.loadFailed.readError': 'Load failed: could not read file',
    'msg.restoredAutosave': 'Restored autosave',
    'msg.restoredAutosaveFrom': when => `Restored autosave from ${when}`,
    'msg.layoutProblem.unrecognised': 'not a recognised layout file',
    'msg.layoutProblem.foreignSchema': 'not a Floor Layout Planner file',
    'msg.layoutProblem.newerVersion': 'saved by a newer version of the planner',

    'theme.default': 'Default',
    'theme.light': 'Light',
    'theme.colourblind': 'Colourblind Safe',

    'catalog.TJ.label': 'Terminal UniJoiner',
    'catalog.UF.label': 'Unitram Feeder',
    'catalog.IJ.label': 'Insulated UniJoiner (pair)',
    'catalog.S248.label': 'Straight 248mm',
    'catalog.S186.label': 'Straight 186mm',
    'catalog.S124.label': 'Straight 124mm',
    'catalog.S124R.label': 'Straight 124mm (Rerailer)',
    'catalog.S248PC.label': 'Straight 248mm (Concrete Tie)',
    'catalog.S186PC.label': 'Straight 186mm (Concrete Tie)',
    'catalog.S124PC.label': 'Straight 124mm (Concrete Tie)',
    'catalog.S64PC.label': 'Straight 64mm (Concrete Tie)',
    'catalog.S62PC.label': 'Straight 62mm (Concrete Tie)',
    'catalog.S62FPC.label': 'Straight 62mm (Feeder, Concrete Tie)',
    'catalog.S78SPC.label': 'Expansion Track 78-108mm (Concrete Tie)',
    'catalog.S64.label': 'Straight 64mm',
    'catalog.S62.label': 'Straight 62mm',
    'catalog.S62F.label': 'Straight 62mm (Feeder)',
    'catalog.S62C.label': 'Straight 62mm (Snap-Track Conversion)',
    'catalog.S186P.label': 'Straight 186mm (Open Pit)',
    'catalog.S186AP.label': 'Straight 186mm (Ash Pit)',
    'catalog.S78S.label': 'Expansion Track 78-108mm',
    'catalog.S45H.label': 'Straight 45.5mm',
    'catalog.S38.label': 'Straight 38mm',
    'catalog.S33.label': 'Straight 33mm',
    'catalog.S29.label': 'Straight 29mm',
    'catalog.S60L.label': 'Straight Beveled Track 60mm (Left)',
    'catalog.S60R.label': 'Straight Beveled Track 60mm (Right)',
    'catalog.BUMPA.label': 'Bumper 62mm (Type A)',
    'catalog.BUMPB.label': 'Bumper 62mm (Type B)',
    'catalog.BUMPAPC.label': 'Bumper 62mm (Type A, Concrete Tie)',
    'catalog.BUMPBPC.label': 'Bumper 62mm (Type B, Concrete Tie)',
    'catalog.BUMPC.label': 'Bumper 50mm (Type C)',
    'catalog.BUMPAI.label': 'Illuminated Bumper 66mm (Type A)',
    'catalog.BUMPBI.label': 'Illuminated Bumper 66mm (Type B)',
    'catalog.BUMPD.label': 'Buffer Track 35mm (Type D)',
    'catalog.V62.label': 'Viaduct Straight 62mm',
    'catalog.DV248.label': 'Double Track Viaduct Straight 248mm',
    'catalog.DV186.label': 'Double Track Viaduct Straight 186mm',
    'catalog.DS186INC.label': 'Double Track Incline Track Straight 186mm',
    'catalog.DV124.label': 'Double Track Viaduct Straight 124mm',
    'catalog.BRT248D.label': 'Double Truss Bridge 248mm, Light Blue',
    'catalog.BRG186D.label': 'Double Plate Girder Bridge 186mm, Light Blue',
    'catalog.V124.label': 'Viaduct Straight 124mm',
    'catalog.V186.label': 'Viaduct Straight 186mm',
    'catalog.V248.label': 'Viaduct Straight 248mm',
    'catalog.BRT248.label': 'Single Truss Bridge 248mm, Red Brown',
    'catalog.BRG124.label': 'Single Plate Girder Bridge 124mm, Light Green',
    'catalog.BRG186.label': 'Single Plate Girder Bridge 186mm, Light Green',
    'catalog.VR249-45.label': 'Viaduct Curve R249 45°',
    'catalog.VR282-45.label': 'Viaduct Curve R282 45°',
    'catalog.VR315-45.label': 'Viaduct Curve R315 45°',
    'catalog.VR348-45.label': 'Viaduct Curve R348 45°',
    'catalog.VR348-30.label': 'Viaduct Curve R348 30°',
    'catalog.VR381-30.label': 'Viaduct Curve R381 30°',
    'catalog.BRG448-15.label': 'Single Curved Girder Bridge R448 15°, Light Green',
    'catalog.BRG481-15.label': 'Single Curved Girder Bridge R481 15°, Light Green',
    'catalog.R216-45R.label': 'Curve R216 45°',
    'catalog.R216-15R.label': 'Curve R216 15°',
    'catalog.R249-45R.label': 'Curve R249 45°',
    'catalog.R249-15R.label': 'Curve R249 15°',
    'catalog.R282-45R.label': 'Curve R282 45°',
    'catalog.R282-15R.label': 'Curve R282 15°',
    'catalog.R315-45R.label': 'Curve R315 45°',
    'catalog.R315-15R.label': 'Curve R315 15°',
    'catalog.R348-45R.label': 'Curve R348 45°',
    'catalog.R348-30R.label': 'Curve R348 30°',
    'catalog.R381-30R.label': 'Curve R381 30°',
    'catalog.R381-10R.label': 'Curve R381 10°',
    'catalog.TURNTABLE_BUMPER.label': 'Turntable Bumper Track',
    'catalog.R481-15R.label': 'Curve R481 15°',
    'catalog.R718-15R.label': 'Curve R718 15°',
    'catalog.R282-45PC.label': 'Curve R282 45° (Concrete Tie)',
    'catalog.R315-45PC.label': 'Curve R315 45° (Concrete Tie)',
    'catalog.R348-45PC.label': 'Curve R348 45° (Concrete Tie)',
    'catalog.R718-15PC.label': 'Curve R718 15° (Concrete Tie)',
    'catalog.R183-45R.label': 'Curve R183 45° (Compact)',
    'catalog.R150-45R.label': 'Curve R150 45° (Compact)',
    'catalog.R117-45R.label': 'Curve R117 45° (Compact)',
    'catalog.T4-L.label': '#4 Turnout',
    'catalog.T4-R.label': '#4 Turnout',
    'catalog.T6-L.label': '#6 Turnout',
    'catalog.T6-R.label': '#6 Turnout',
    'catalog.TY2.label': '#2 Wye Turnout',
    'catalog.TC-L.label': 'Compact Turnout',
    'catalog.TC-R.label': 'Compact Turnout',
    'catalog.DX6.label': 'Double Crossover',
    'catalog.SX4L.label': '#4 Single Crossover',
    'catalog.SX4R.label': '#4 Single Crossover',
    'catalog.D248.label': 'Double Track Straight 248mm',
    'catalog.D186.label': 'Double Track Straight 186mm',
    'catalog.D124.label': 'Double Track Straight 124mm',
    'catalog.D62.label': 'Double Track Straight 62mm',
    'catalog.D62F.label': 'Double Track Straight 62mm (Dual Feeder)',
    'catalog.D248S.label': 'Double Track Straight 248mm (Slab)',
    'catalog.D186S.label': 'Double Track Straight 186mm (Slab)',
    'catalog.D124S.label': 'Double Track Straight 124mm (Slab)',
    'catalog.D62S.label': 'Double Track Straight 62mm (Slab)',
    'catalog.D62FS.label': 'Double Track Straight 62mm (Dual Feeder, Slab)',
    'catalog.DW51L.label': 'Double Track Widening Section',
    'catalog.DW51R.label': 'Double Track Widening Section',
    'catalog.TWA124.label': 'Unitram Conversion Track 124mm',
    'catalog.TWS62.label': 'Unitram Double Track Straight 62mm',
    'catalog.TWS124.label': 'Unitram Double Track Straight 124mm',
    'catalog.TWS186.label': 'Unitram Double Track Straight 186mm',
    'catalog.TWR180L.label': 'Unitram Street Track Curve R180-45° Left',
    'catalog.TWR180R.label': 'Unitram Street Track Curve R180-45° Right',
    'catalog.TWEP180L.label': 'Unitram Street Electric Turnout R180mm Left',
    'catalog.TWEP180R.label': 'Unitram Street Electric Turnout R180mm Right',
    'catalog.TW-X90.label': 'Unitram Street 90° Crossing 62mm',
    'catalog.ROADPLATE_INNER.label': 'Unitram Quarter Circle Inner Road Plate',
    'catalog.ROADPLATE_STRAIGHT.label': 'Unitram Straight Road Plate 124mm',
    'catalog.ROADPLATE_CENTER.label': 'Road Crossing Center Plate',
    'catalog.ROADPLATE_CORNER.label': 'Corner Road Plate',
    'catalog.ROADPLATE_CENTERLINE.label': 'Corner Road Plate w/Centerline',
    'catalog.ROADPLATE_CENTERLINE_62.label': 'Straight Road Plate w/Centerline - 62mm',
    'catalog.D282-45.label': 'Double Track Curve R282/315 45°',
    'catalog.D381-45.label': 'Double Track Curve R381/414 45°',
    'catalog.D447-45.label': 'Double Track Curve R447/480 45°',
    'catalog.D282-22.label': 'Double Track Curve R282/315 22.5°',
    'catalog.D282-22L.label': 'Double Track Curve R282/315 22.5°',
    'catalog.D381-22.label': 'Double Track Curve R381/414 22.5°',
    'catalog.D381-22L.label': 'Double Track Curve R381/414 22.5°',
    'catalog.DS381-45.label': 'Double Track Curve R381/414 45° (Slab)',
    'catalog.DS381-22.label': 'Double Track Curve R381/414 22.5° (Slab)',
    'catalog.DS381-22L.label': 'Double Track Curve R381/414 22.5° (Slab)',
    'catalog.D447-22.label': 'Double Track Curve R447/480 22.5°',
    'catalog.D447-22L.label': 'Double Track Curve R447/480 22.5°',
    'catalog.DV381-45.label': 'Double Track Viaduct Curve R381/414 45°',
    'catalog.DV381-225.label': 'Double Track Viaduct Curve R381/414 22.5\u00b0 (Concrete Tie)',
    'catalog.DV381-22.label': 'Double Track Viaduct Curve R381/414 22.5°',
    'catalog.DV381-22L.label': 'Double Track Viaduct Curve R381/414 22.5°',
    'catalog.DV248PC.label': 'Double Track Viaduct Straight 248mm (Concrete Tie)',
    'catalog.DV186PC.label': 'Double Track Viaduct Straight 186mm (Concrete Tie)',
    'catalog.DV124PC.label': 'Double Track Viaduct Straight 124mm (Concrete Tie)',
    'catalog.DV381-22PC.label': 'Double Track Viaduct Curve R381/414 22.5° (Concrete Tie)',
    'catalog.DV381-22PCL.label': 'Double Track Viaduct Curve R381/414 22.5° (Concrete Tie)',
    'catalog.X15L.label': '15° Crossing',
    'catalog.X15R.label': '15° Crossing',
    'catalog.X90.label': '90° Crossing',
    'catalog.TURNTABLE.label': 'Turntable',
    'catalog.TURNTABLE_WEDGE.label': 'Track Turntable Section',
    'catalog.TURNTABLE_CONNECTOR.label': 'Fitted Connecting Straight Track',
    'catalog.R678-10R.label': 'Fitted Connecting Curved Track (Left)',
    'catalog.R678-10L.label': 'Fitted Connecting Curved Track (Right)',
    'catalog.PLATFORM_A.label': 'One-sided Platform, Type A',
    'catalog.PLATFORM_B.label': 'One-sided Platform, Type B',
    'catalog.PLATFORM_E1.label': 'One-sided Platform End (Left)',
    'catalog.PLATFORM_E2.label': 'One-sided Platform End (Right)',
    'catalog.ISLAND_A.label': 'Island Platform, Type A',
    'catalog.ISLAND_B.label': 'Island Platform, Type B',
    'catalog.ISLAND_C.label': 'Island Platform, Type C',
    'catalog.ISLAND_END_A.label': 'Island Platform End, Type A',
    'catalog.ISLAND_END_B1.label': 'Island Platform End, Type B (Left)',
    'catalog.ISLAND_END_B2.label': 'Island Platform End, Type B (Right)',
    'catalog.ISLAND_END_C1.label': 'Island Platform End, Type C (Left)',
    'catalog.ISLAND_END_C2.label': 'Island Platform End, Type C (Right)',
  },
};
let currentLang = (()=>{ try{ return localStorage.getItem('katoLang') || 'en'; }catch(err){ return 'en'; } })();
// Looks up `key` in the current language, falling back to English on a
// missing key (never on a missing language: STRINGS.en always exists).
// args are passed through when the value is a function (parameterised
// strings); a plain string ignores them.
function tr(key, ...args){
  const table = STRINGS[currentLang] || STRINGS.en;
  let v = table[key];
  if(v==null) v = STRINGS.en[key];
  if(v==null){ console.warn('Missing string:', key); return key; }
  return typeof v==='function' ? v(...args) : v;
}
function catalogLabel(type){ return tr('catalog.'+type.id+'.label'); }

