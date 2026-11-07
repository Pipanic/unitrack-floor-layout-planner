# User guide

<!--
EDITING NOTES — this file is the source for the planner's Help popup
(`help.body.html` in katoplanner.html). Edit freely, then ask Claude to
rebuild the Help popup from it.

- `## Heading {#help-id}` starts a section. Each section appears in the
  guide's section list in this order. The {#help-id} keeps links stable;
  for a new section, leave it off and one will be assigned.
- A table with the header `| Control | What it does |` becomes the two-column
  rows. Any other paragraph, numbered list or bullet list stays as it is.
- `[Shift]`, `[Ctrl]`, `[F]` … are drawn as keyboard keys.
- `{button gestures ✋ Gestures}`, on a line of its own, is a button that
  opens the Gestures window, labelled with the text after `gestures`.
- `**bold**` is bold. Plain Unicode is fine: ° × — ⚠ ↺ 📦.
- `{#565d69}` is a colour swatch, `{dot #3ddc84}` a round one,
  `{#2c4a63 border #4fb0ff}` a swatch with an outline, and
  `{#584280 to #eb7daf}` a gradient.
- Spaces between numbers and units (248 mm, 0.30×) are made non-breaking
  automatically.
- Anything you'd like changed but can't express here, write as a note in
  square brackets, e.g. [NOTE: add a screenshot of the gradient colours], and
  it'll be raised rather than published.
-->

## Getting started {#help-start}

Plan a layout with real KATO Unitrack. Every piece is its real size, measured in millimetres, and track joins only where the real pieces would.

Unitrack's primary use is for non-permanent layouts that can be set up and taken down in a day. This planner is intended for designing these temporary floor layouts, known in Japan as “畳レイアウト” (Tatami Mat Layout), and isn't meant to be used to design intricate or complex model railways. As such, there are only two elevations: 0mm (ground level), and 50mm (KATO's standard bridge height).

Try the following to get started!  

1. **Drag a piece** from the palette on the left onto the canvas. Drop it near the end of existing track and it snaps on.
2. **Keep building:** click a green dot {dot #3ddc84} (an open track end), then click pieces in the palette. Each one attaches to the end of the last, so you can lay a whole run by clicking.
3. **Arrange:** drag pieces to move them, and scroll while dragging to rotate them.
4. **Export:** Export Parts List shows what you need to build your design, and “Show as packs” the fewest KATO packs that cover it.
5. **Learn gestures:** Learn about the gestures and shortcuts to help you build faster.

{button gestures ✋ Gestures}

An empty layout also offers every Unitrack Set to start from. Hover over one to see it, and click to place it.

The green panel on the right always explains whatever the pointer is over, including any shortcuts that work there. If you're unsure what something does, hover over it.

## Viewing the layout {#help-view}

| Control | What it does |
|---|---|
| Drag empty canvas, or hold [W] [A] [S] [D] | Pan. An empty layout doesn't pan. |
| Scroll over empty canvas, − / +, or the [+] / [−] keys | Zoom. The number between the buttons is the current zoom. |
| ↺, or [Space] | Fit the whole layout in view. |
| ↕ ↓ ↑, or [V] | Show every level at full strength (↕), or fade the other level to work on ground (↓) or elevated (↑) track. [V] moves to the next of the three each time. |
| Detail button, or [T] | Show or hide track detail: the ties (sleepers), on slab track the slab and its fastenings, and on Unitram street track the paving, its joints and the road markings, leaving the bare roadbed and rails. The icon shows what's on screen now. They also hide themselves below 1.00× zoom (⚙️ Settings can make that sooner, later or never); turn them on there to keep them until you next zoom back in. |
| Labels button, or [L] | Part labels, four settings in turn: Limited (the default) labels only the pieces easily mistaken for a similar one, such as the S64 and the S60s; Printed labels every piece the same way, printed on the track so they grow and shrink with it; All labels every piece with its part code, horizontal, readable when zoomed out and growing with the track above 1.00× zoom, and moved along its piece where labels would crowd, or left off if there's no room anywhere along it; Off shows none. The icon shows the current setting. |
| Ports button, or [P] | The same for the green dots and orange arrows, below 0.30×. The selected end (blue dot) and the snap highlights always show, and [,] and [.] still work. |

If the planner is running sluggishly, or you've placed many pieces, try turning detail off.

A dashed detail or ports button means you have them on, but they're hidden at this zoom. The side panel shows the layout's piece count, total track length and footprint.

## Placing track {#help-placing}

On the left side of the window is the "palette", where every KATO Unitrack piece is available for you to place.

| Control | What it does |
|---|---|
| Drag a palette piece | Place it. Near a green dot {dot #3ddc84} it snaps on; anywhere else it lands where you drop it. Drop it back on the palette to cancel. |
| Scroll while dragging, or [Q] / [E] | Rotate it 15° per notch or key press. |
| [Shift]+Scroll while dragging | Morph the piece into different size, such as another length or radius, where there is one. At the last size it turns back instead of jumping to the first. An expansion track (S78S) changes its length instead, 1mm at a time from 78 to 108mm. |
| [F] while dragging | Flip it to its mirror image, if available. e.g. turnouts. |
| Click a green dot, then a palette piece | Attach that piece there. The new piece's far end becomes the selected end, so each further click extends the run. |
| Double-click a green dot {dot #3ddc84} | Add a duplicate of the same piece at that end. |
| Click a palette piece (with no green dot selected) | Place it in the middle of the view. Clicking again without moving the view steps each new piece a little down and right, as repeated pastes do. |
| Select a green dot, then Shift+click another | Fill the gap between the two ends: the planner finds runs of up to 6 pieces that join them exactly (or within the play of real joiners) without crossing other track, and previews the best. |
| Select a green dot, then [J] or Fill Gap in the side panel | The same, joining it to the nearest open end it can reach. |
| While a fill is previewed | Scroll, or [,] and [.], show the other fills: exact fits first, then those needing the least joiner play; fewer and commoner pieces first where fits tie. [Enter], or a click on the preview, places it; [Esc] or a click elsewhere cancels. |

Drop an expansion track (S78S) with one end on open track, and if an open end faces it 78 to 108mm further along the same line, it stretches to join both. A wider or narrower gap leaves it at its length, joined at one end. Its current length is printed on it.

Search the palette by name, catalogue number or part code by typing into the search bar in the top left. Hyphens are optional, so “20000” finds 20-000. Typing a number anywhere starts a new search with it, so just typing 249 shows the R249 curves; [Esc], or a click anywhere else (dragging a piece out included), gives the keys back to the layout. To clear the search, click its ×, or press [Esc] again when nothing is selected.

Click a category heading to collapse it; right-click one to collapse or expand them all. Indented subcategories, such as Straights (Concrete Tie), hold other versions of the same pieces; they stay visible when their parent is collapsed, and expanding them all leaves them closed.

Curves come in one hand: attach one by either end to turn left or right.

Fill Gap joins single track, using plain pieces (and an expansion track where a straight gap needs one). In Limited Mode it only uses pieces from your inventory that aren't already on the layout.

Between ends at different heights, the fill is graded evenly from one height to the other, and the preview shows its slope. It can come out steeper than your slope limit (KATO's 4% unless you change it in ⚙️ Settings); at half as steep again (6% for 4%) or steeper, a warning appears on it once it's placed. Scroll through the other fills for a longer, gentler one. [J] tries ends at the same height first. As in Gradient Mode, there must be at least one flat piece between two gradients, so a fill between different heights can't start or finish on a slope.

## Selecting {#help-selecting}

Several shortcuts are available to help you quickly select any placed track you wish to edit.

| Control | What it does |
|---|---|
| Click a piece | Select it, replacing the current selection. |
| [Shift]+Click a piece | Add it to the selection, or remove it. |
| Double-click a piece | Select everything connected to it. |
| Orange arrow, or [,] / [.] | Extend the selection in that direction, through everything beyond that end. [,] (the [<] key) uses the arrow facing furthest left or up, [.] (the [>] key) the one facing furthest right or down. |
| Right-drag | Draw a marquee selection box: every piece with a track end inside it is selected. |
| [Shift]+Right-drag | Box-select, adding to the selection. |
| Crosshair on, tap [Ctrl] | Box-select without the mouse, adding to the selection: a small white box around the crosshair shows it's on, the selection box starts at the crosshair, and its corner follows as [W] [A] [S] [D] pan. Tap [Ctrl] again to finish, or [Esc] to cancel. Let go of [Ctrl] before panning: [Ctrl]+[W] closes the browser tab. |
| [Ctrl]+[A] | Select every piece. |
| [Esc], or click empty canvas | Deselect. |

The side panel shows what's selected: the piece and its part code, or a count of each part.

## Moving & editing {#help-editing}

| Control | What it does |
|---|---|
| Drag a piece | Move it, or the whole selection if it's part of one. Joins to pieces outside the selection break as you pull away; drop near a green dot to join somewhere else. |
| Scroll, while dragging | Rotate the piece. A selection turns as one group about the piece you're holding. |
| [Q] / [E], with a selection | Turn it 15° anticlockwise / clockwise about its centre. Joins to pieces outside the selection break, as when dragging; ends that land exactly on another end join. |
| Tap [Shift] | Select without the mouse: turn on a crosshair in the middle of the canvas, and tap [Shift] again or press [Esc] to turn it off. [W] [A] [S] [D] pan the layout beneath it, slowly at first and faster the longer you hold them. |
| Crosshair on, tap [Space] | Select the piece under the crosshair, adding it to the selection, or deselect it if it's already selected. Pan to the next piece and tap again to build up a selection. |
| Crosshair on, hold [Space] and pan | Select every piece the crosshair passes over. If you start on a piece that's already selected, deselect them instead. |
| Arrow keys, with a selection | Move it 33 mm, KATO's track spacing. [Shift] moves it 165 mm, [Ctrl] just 3 mm. You can change all three in ⚙️ Settings. Joins to pieces outside the selection break, and it snaps to any end the step brings within range. Stepping away from a join doesn't snap back. |
| [Shift]+Scroll, whilst dragging | Morph the piece into a different size. An expansion track changes length, and its end moving away comes unjoined. |
| [F] | Flip the one selected piece in place. Joins that still line up are kept. Also works whilst dragging a piece. |
| [Delete] or [Backspace], or the Delete button | Delete the selection. |
| [Ctrl]+[C] / [X] / [V] | Copy, cut, paste. Each paste is offset so repeats don't stack. A pasted group keeps its own joins but isn't joined to anything else. |
| [Ctrl]+[Z]; [Ctrl]+[Shift]+[Z] or [Ctrl]+[Y] | Undo, redo: up to 50 steps. Specific buttons for this function are also in the header, top right of the screen. Undo works at any time, even mid-drag, where it cancels the drag. |

## How track joins {#help-joins}

- Two ends join when they meet: within 3 mm and facing each other. A piece dropped into a gap joins at both ends, and track that only crosses or passes over other track is never joined.
- Green dots {dot #3ddc84} are open ends. While you drag, the end you're holding shows orange {dot #ffb347} and the end it will join shows red. {dot #ff5a5a}
- Banked (superelevated) double-track curves join only other banked curves, and only as a continuing curve. Remember to use easement curves to return the banked curve to normal.
- Track Turntable Sections snap to the turntable's rim rather than to track ends.
- A piece joined to the top of a slope takes its height, so track built off the top stays elevated.

## Slopes & Gradient Mode {#help-gradient}

Track is either on the ground or at KATO's 50 mm elevated height, the height of its viaducts and bridges. A slope (gradient) climbs between the two across a run of pieces. KATO recommends 4% or gentler, and that's the planner's limit unless you choose another in ⚙️ Settings; a slope half as steep again (6% for 4%) or steeper shows a yellow warning triangle. A yellow triangle also marks tracks that cross with too little clearance: one must be the full 50 mm above the other for a train to pass under, or both at the same height. Hover over it for the gap.

| Control | What it does |
|---|---|
| ▲ Gradient Mode, or [G] | Open or close Gradient Mode. [Esc] also closes it. |
| Click a straight, curve or double-track piece | Start a new slope there. |
| Then click a piece further along the run | Extend the slope to it in one go. Clicking a piece already in the slope shortens it to end there. On a loop, where a piece can be reached both ways, a purple arrow chooses the direction first. |
| Purple arrow, or [,] / [.] | Add the next piece in that direction. The darker arrow, pointing back, removes the last one. [,] uses the arrow facing furthest left or up, [.] the one facing furthest right or down, so on a slope running left to right [.] adds and [,] removes. |
| [Ctrl]+[Z] | Remove the last piece. |
| The tick, or [Enter] | Confirm: the slope climbs from the ground to 50 mm across the chosen pieces, or descends if it starts elevated. |
| The red cross, or [Delete] | Cancel the slope you're building and start again, staying in Gradient Mode. The cross sits on the slope's first piece, marking where it starts. |
| Click an existing slope | See its length and gradient. The bin icon or [Delete] removes it. |
| ⬆️ Elevate Selection | Outside Gradient Mode, raise the selected pieces to 50 mm, flat. Once they're all elevated, the button becomes Lower Selection and puts them back on the ground. Joins to track left at another height come apart; ends that meet track at the new height join it. |

While Gradient Mode is open, every slope is coloured by steepness: red is too steep, bright green is right at your limit (4% unless changed), darkening as it gets gentler. (The Colourblind Safe theme uses yellow and navy instead of green.) Turnouts and crossings can't be sloped, and two slopes need at least one flat piece between them. Other editing and marquee-select are off in Gradient Mode; panning and zooming still work.

The Double Track Incline Track Straight 186mm (WS186PCINC) is placed already in a gradient. It will show the "too steep" warning until it is integrated into a proper slope.

## Power View

Power View is a rule of thumb for where your layout needs feeders. On Unitrack most of the power lost on the way to a train is lost at the joiners between pieces, so it counts joints rather than distance.

| Control | What it does |
|---|---|
| ⚡ Power View | Colour the track by how many joints it is from the nearest feeder track. Click again to turn it off. You can keep editing while it's on, but Gradient Mode is unavailable until you turn it off. |
| Hover over a piece | See its count. |
| Red at … joints | Set how many joints from a feeder count as too far. |
| Misc. → Terminal UniJoiner (24-818) | A feeder that fits in a joint instead of a feeder track, for where there's no room for one. Drag it onto any track end, open or joined, and it sits on whichever side of the track you drop it (on double track, always the outer side); with a green end selected, clicking it fits it there. One per joint. Power View counts both pieces at that joint as fed; on double track it feeds only the track it's on. |
| Unitram → Unitram Feeder (44-847) | The same as the Terminal UniJoiner, but it fits only Unitram track, which includes the conversion track. The Terminal and Insulated UniJoiners fit Unitram track too. |
| Misc. → Insulated UniJoiner (24-816) | Stops power crossing a joint, to split the layout into separately fed sections. Drag it onto a joint between two pieces (not an open end); it sits across the track as a crossed-out ⚡. If either piece is dragged away, it's removed with the joint. Each counts as a pair, one per joint, so a pack of 20 fits ten joints; on double track it insulates only the track it's on. Power View stops counting at it. |
| Drag a UniJoiner's ⚡ | Move it to another joint or track end, or to the other side of the same one. Click it, then [Delete], to remove it. If you drag away one of the two pieces at a Terminal UniJoiner's joint, it stays with the piece you left behind. |

Track is blue at a feeder and turns red as it nears 20 joints; past that, a feeder nearer that spot would help. For comparison, KATO's M2 set runs fine on its one feeder with its farthest track about 11 joints away. If your track needs feeders closer than that, or copes with them further apart, set your own number in the box under the button ("Red at … joints"); it's remembered in this browser. Joints are counted along the track either way round, so a loop fed at one point is fed from both sides. Leaving a turnout counts as 1.3 joints, for its internal contacts. KATO's turnouts are power-routing: a feeder before a turnout powers both of its routes, but a feeder on one route only powers back to the start of the turnout, so the other route shows as not powered unless something else feeds it. Dark track has no feeder at all. Double track is two separate tracks, so each track is coloured by its own distance, split down the middle of the piece; and the double crossover (WX310) passes no power across the insulated gap in its centre, which cuts both tracks and both diagonals, so each of its four quarters is coloured by its own distance from a feeder. It's a guide, not a voltage reading.

## Tabletops {#help-tabletop}

A tabletop marks out your real benchwork or floor space, so you can see what fits.

| Control | What it does |
|---|---|
| Palette → Tabletop / Floorspace | Add a 250 × 250 mm tabletop in the middle of the view. |
| Drag it, or drag a corner | Move it, or resize it. It snaps to other tabletops' edges and corners. |
| Click it, then a size label | Type an exact width or height, in millimetres or the inches chosen in ⚙️ Settings. [Enter] confirms, [Esc] cancels. |
| Padlock | Lock it in place. A locked tabletop ignores the mouse, so you can work on track over it freely; click its padlock to unlock it. |

Tabletops that touch or overlap are drawn as one outline. A selected tabletop can be copied, cut, pasted and deleted like track.

## Text labels

A text label puts your own words on the layout: a station name, a note, a direction.

| Control | What it does |
|---|---|
| Palette → Text Label | Add a label in the middle of the view and start typing. [Enter] finishes, [Shift]+[Enter] starts a new line, [Esc] cancels. |
| Double-click it, or [Enter] when selected | Edit the text. A label left empty is removed. |
| Drag it | Move it. Scroll while dragging to turn it 15° per notch. |
| Drag a corner | Make the text larger or smaller. |
| Padlock | Lock it in place. A locked label ignores the mouse, so you can work on the track under it; click its padlock to unlock it. |

A selected label can be copied, cut, pasted and deleted like track. Labels are saved with the layout and appear on Export PNG.

## Unitrack Sets {#help-sets}

The Unitrack Sets group places a whole KATO track set, assembled as its real layout.

| Control | What it does |
|---|---|
| Drag a set | Place it where you drop it. Scroll rotates it. |
| Click a set | Place it in the middle of the view. |

A set lands as one selected group. It doesn't snap as it's placed; drag the group afterwards to join it to other track. Spare pieces that come in the set are placed beside it.

## Special pieces {#help-special}

- **62 mm bumpers** (Types A and B) come on their own 62 mm straight (S62), placed together and counted as one product.
- **Turntable:** place Track Turntable Sections from Misc. around the pit. They snap to its rim, three tracks each, and selecting the turntable selects them too. The Fitted Connecting tracks join the sections' outer ends.
- **Island Platforms (23-171 PI-A, 23-172 PI-B, 23-173 C) and End A (23-174):** 41 mm wide, to fit between two tracks. A and B have a roof overhanging both; C has none. Drag one near a straight and it snaps flush to it, turning to match, and can be on either side of it; it joins other island pieces at either end (not one-sided platforms). The curved ends have a straight edge for a straight track and a curved one for a curve: PIE-2 and PIE-3 (23-175) for R718, PIE-4L and PIE-4R (23-176, 248 mm) for R481; [F] swaps each pair.
- **One-sided Platforms (23-178 PS-A, 23-179 PS-B) and their ends (23-180, PSE-1 left and PSE-2 right):** in Structures. The platforms have a 46 mm roof that overhangs the track by 5 mm; the ends are 200 mm of plain 41 mm slab with no roof. Drag one beside a straight (single or double track) and it snaps flush to the roadbed edge, parallel to the track, and slides freely along it; drag it away to unsnap. It snaps when it's turned within 30° of parallel, so turn it with the scroll wheel or [Q] / [E] first. Platforms have green ends of their own, which only other platforms join: drag one near the end of another (PS-A or PS-B, either end) and it snaps on, in line, as track does. PSE-1 only fits a platform's left end and PSE-2 its right; [F] turns one into the other. Clicking its palette button with a platform end selected attaches it there; otherwise it goes in the middle of the view. A platform stays on the ground whatever height the track beside it is.
- **Unitram Conversion Track (40-025 TWA124PC):** in Unitram. A 124 mm double-track piece whose tracks run 33 mm apart (Unitrack) at one end and 25 mm apart (Unitram street track) at the other, each moving 4 mm in a gentle S-curve. Two come in a pack; turn one round to use it at the other end of a Unitram section.
- **Unitram Street Track Curves (40-103 TWR180L, 40-104 TWR180R):** in Unitram. Double street track that starts 25 mm apart and straight, then turns 45° on a centreline of R180, its tracks spreading to 33 mm apart at the 45° end, so ordinary double track joins there. A left and a right also meet there, turning the street through 90° and leaving a 62 mm square at the outside corner. Shift+scroll or F swaps left and right.
- **Unitram Street Electric Turnouts R180mm (40-212 TWEP180L left, 40-213 TWEP180R right):** in Unitram. F or Shift+scroll swaps left and right. The street curve's plate, with both tracks also running straight on, 25 mm apart, to a 186 mm end. Each track can leave on its curved route to the 45° end, so the outer route crosses the other track. In Power View each track is a turnout of its own: fed from the end where the tracks start, power reaches both its routes; fed at a route's end, it reaches only that start.
- **Unitram Street 90° Crossing (40-301 TW-X90):** in Unitram. A 62 mm square where double street track crosses double street track, each track running straight through with its own power.
- **Road plates:** drag one near a straight edge and it snaps flush against it, level with either end of that edge, keeping your rotation to the nearest quarter turn (scroll or Q and E turn it as you go). That covers other road plates, Unitram straights, the crossing, the conversion track, and the long edge and square ends of street curves and turnouts. A quarter plate joins other plates by its two straight sides only. No road plate snaps to ordinary Unitrack.
- **Unitram Quarter Circle Inner Road Plate (41-101):** in Unitram. A road plate with no track that fills the inside of a 90° street corner made of a TWR180R and a TWR180L. Drag it near the inside of a street curve and it snaps into place, turned to fit. It stays on the ground and counts no track length.
- **Unitram Straight Road Plate 124mm:** in Unitram. Only sold inside sets such as TV1, so it has no part code or catalogue number. It fills the space between quarter plates. Against a Unitram straight it goes on either side, level with either end, with its road towards the track.
- **Road Crossing Center Plate:** in Unitram. A 62 mm square road plate that comes with each R180 street curve, so it has no part code or catalogue number. It fills the notch at the outside of the corner two curves make.
- **Straight Road Plate w/Centerline - 62mm:** in Unitram. A 62 mm square of road with a hatched median and yellow centreline running through it, which carries on from one plate to the next. Only sold inside sets, so it has no part code or catalogue number.
- **Corner Road Plate w/Centerline:** in Unitram. A road plate 186 mm long and 62 mm wide, with a crossing, a hatched median and a yellow centreline. Only sold inside sets, so it has no part code or catalogue number.
- **Corner Road Plate:** in Unitram. A 186 mm square road plate for the corner between straight street tracks, printed like the quarter circle plate. Only sold inside sets, so it has no part code or catalogue number.
- **Unitram Double Track Straights (40-033 TWS62, 40-024 TWS124, 40-014 TWS186):** in Unitram. Street track with the two tracks 25 mm apart, in a 62 mm wide plate (a little wider than a double-track piece), with an edge strip of ordinary roadbed colour and a lighter paving with panel joints.
- **Beveled 60 mm straights (S60L/R)** are sold only with #4 turnouts, so they have no catalogue number of their own, and “Show as packs” buys them as part of a #4 turnout pack.

## Limited Mode & Inventory {#help-limited}

Limited Mode limits you to only the track you own.

| Control | What it does |
|---|---|
| 📦 Inventory | Enter what you own: click the part number to add 1, or right-click it to subtract 1. You can also type the exact count, or add a whole pack or set by its catalogue number (e.g. 20-221). Save and Load keep your inventory as its own file, and [Ctrl]+[Z] / [Ctrl]+[Y] undo inside the window. Confirm applies your changes; × discards them. |
| Mode menu → Limited Mode | The palette shows how many of each piece you have left, and greys out any you have none left of. Anything that would go over is refused, and the green panel says why. Pieces that are placed beyond what you own, for example after loading a layout, or from switching from Free Mode into Limited Mode, are drawn red. |

Choosing Limited Mode with an empty inventory opens the Inventory window; closing it with nothing owned returns to Free Mode, where every piece is available.

## Parts list & buying {#help-parts}

| Control | What it does |
|---|---|
| Export PNG | A picture of the whole layout (or, with some pieces selected, Export Selected as PNG: just those): each piece's outline, with its part code beside it. Each slope has a dashed line along its middle, with its height at each end and its gradient and length halfway; track passing under higher track shows dashed where it's covered. It opens as a preview; Save PNG downloads it (up to 4000 pixels on its longer side). |
| Export Parts List | List every KATO product in the layout with its catalogue number. With pieces selected, it lists only the selection. |
| Export as CSV | Save the list as a spreadsheet file. |
| Show as packs | The fewest KATO packs that cover the list. Turnouts and other kits are bought only for their main piece; the rest of the box counts towards the list. Spares are listed, and packs whose contents aren't yet confirmed are marked ⚠. Track sets are bought only when they're the only source of a piece (V12's concrete viaducts); a set that your layout would use at least 80% of is suggested underneath instead, with how many packs it would replace. |

The list counts products, not placed pieces: a 62 mm bumper and its straight are one item.

## Files & settings {#help-files}

| Control | What it does |
|---|---|
| 💾 Save, or [Ctrl]+[S] | Download the layout as a file. |
| 📂 Load, or [Ctrl]+[O] | Open a saved layout. Unknown pieces are skipped and counted; files from a newer version of the planner are refused. |
| 🆕 New | Start an empty layout. It asks first. |
| ⚙️ Settings: theme | Default, Light, or Colourblind Safe, which changes only the gradient colours. Track looks the same in every theme, as the real pieces do. |
| ⚙️ Settings: language | The planner's language. |
| ⚙️ Settings: units | Millimetres or inches for the lengths and sizes the planner shows: track length, footprint, tabletops, slope runs. Piece names and KATO's 50 mm height stay in millimetres, and saved files are the same either way. |
| ⚙️ Settings: arrow key steps | How far the arrow keys move the selection, alone, with [Shift] and with [Ctrl]. They start at 33 mm, 165 mm and 3 mm, and ↺ beside each puts its default back. |
| ⚙️ Settings: steepest slope | The slope limit Gradient Mode colours against: 2%, 3%, 4% (KATO's standard) or 5%. The warning triangle appears at half as steep again. |
| ⚙️ Settings: hide detail | When ties, green dots and orange arrows hide as you zoom out: sooner, normal, later, or never. |
| ⚙️ Settings: autosave | Turn the browser autosave on or off. Turning it off deletes the saved copy. |
| ⚙️ Settings: forget everything | Delete everything the planner keeps in this browser (the autosaved layout, your inventory and every setting) and start afresh. It asks first. Saved layout files aren't touched. |
| ⚙️ Settings: track colours | Your own colours for the roadbed, level track above the ground, the bottom and top of a slope, Power View's two ends, and selected pieces. ↺ beside each puts its default back. |

The planner also autosaves to this browser as you work and restores it next time, unless you turn that off in ⚙️ Settings. It's a safety net, not a substitute for saving: clearing your browser's data removes it. Your inventory is kept separately from layouts.

## Keyboard shortcuts {#help-keys}

| Control | What it does |
|---|---|
| [,] / [.] | Extend the selection from its end facing left or up / right or down; in Gradient Mode, the slope; in a Fill Gap preview, the previous / next fill. (The same keys as [<] / [>].) |
| [W] [A] [S] [D] | Pan (hold). Also works while dragging, to carry a piece beyond the edge of the view. |
| [+] / [−] | Zoom in / out. |
| [Space] | Fit the whole layout in view (the ↺ button). With the crosshair on, select or deselect the piece under it; hold and pan to do the same to everything it crosses. |
| [Shift] (tap) | Turn the selection crosshair on or off. With it on, [Ctrl] (tap) starts and ends a selection box. |
| [V] | Next level focus: every level, ground level, elevated track, and round again (the ↕ ↓ ↑ buttons). |
| [0]–[9] | Start a palette search with that number; carry on typing the rest of it. |
| [T] | Toggle detail (ties and slab detail). |
| [L] | Cycle the part labels: Off, Limited, Printed, All. |
| [P] | Show or hide the green dots and orange arrows. |
| [Q] / [E] | Turn the selection, or the piece, set or label being held, 15° anticlockwise / clockwise. Joins to pieces outside the selection break, as when dragging. |
| Arrow keys | Move the selection 33 mm; with [Shift] 165 mm, with [Ctrl] 3 mm (change them in ⚙️ Settings). Joins to pieces outside the selection break, and it snaps to any end the step brings within range. |
| [F] | Flip the selected or held piece. |
| [G] | Open or close Gradient Mode. |
| [J] | Fill the gap from the selected green dot to the nearest open end it can reach. |
| [Delete] or [Backspace] | Delete the selection; in Gradient Mode, cancel the slope being built, or delete the selected slope. |
| [Esc] | Cancel a crosshair selection box, or turn the crosshair off. Otherwise deselect, leave Gradient Mode, or close a window. With nothing to deselect, clear the palette search. |
| [Enter] | Confirm a slope, a typed size, or a question; edit a selected text label. |
| [Ctrl]+[S] | Save the layout (as the 💾 Save button). |
| [Ctrl]+[O] | Load a layout (as the 📂 Load button). |
| [Ctrl]+[A] | Select every piece. |
| [Ctrl]+[C] / [X] / [V] | Copy, cut, paste. |
| [Ctrl]+[Z] | Undo; in Gradient Mode, remove the slope's last piece. |
| [Ctrl]+[Shift]+[Z], [Ctrl]+[Y] | Redo. |

On a Mac, use [Cmd] for [Ctrl]. Shortcuts don't act while you're typing in a text box. The view keys (zoom, [Space], [V], [T], [L], [P]) and the number keys also work in Gradient Mode and while choosing a Fill Gap.

## About {#help-about}

Floor Layout Planner is a free, independent tool for planning N-scale Unitrack layouts. It is not made by, affiliated with or endorsed by KATO. KATO and Unitrack are trademarks of their owners and are used here only to say which track the planner is for. Part numbers and dimensions are published facts; check them against KATO's own catalogue before you buy. The planner is free to use and share for non-commercial purposes under the PolyForm Noncommercial License 1.0.0, and comes as it is, with no warranty and no promise of support.
