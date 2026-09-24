# RoSpot — the «Ie» design language

The binding visual reference for the app. Every UI/UX change follows it.

**Source of truth for the design** is the Direction B canvas at
`assets/RoSpot Motifs.dc.html` (turn 2, option `2b` — eight screens: Onboarding, Sign in,
Map, List, Empty state, Detail, Add, Profile). `assets/github.md` is that canvas's sync
record; its screen map predates the restyle and lists only what the canvas recreated, so it
is history rather than an index. When the canvas and this document disagree about a screen that has shipped,
this document is right — it records what was built, and the divergences from the canvas
are deliberate and listed at the end. When they disagree about a screen that has *not*
shipped, the canvas is right.

The language is Romanian cross-stitch — the «ie», the embroidered blouse. Festive star
bands as the app's signature, stitched cards, diamond (rhomb) accents, hora dancers where
the app is empty. Everything is system-ui type; there is no display face, no dark mode, and
no animation beyond a photograph's fade — the gallery's, and the List thumbnail's.

---

## 1. Palette

Lives in two places on purpose: `src/theme.ts` for the plain values navigator options and
inline styles need, `tailwind.config.js` for the NativeWind classes screens use.
`src/__tests__/palette.test.ts` holds the two in sync — same names, same values. Adding a
token means adding it in both.

| Token | Class | Hex | Role |
|---|---|---|---|
| `surface` | `surface` | `#FBFAF7` | The app's warm ground. Screen backgrounds, the tab bar, and the label colour on anything filled cherry. |
| `ink` | `ink` | `#171310` | Headings, names, body copy. |
| `muted` | `muted` | `#6B6259` | Addresses, subtitles, hints, secondary labels, icons that aren't the point. |
| `line` | `line` | `#E4DED4` | Every hairline: card borders, contact-row rules, chip outlines when off, input borders. |
| `cherry` | `cherry` | `#8C1D2C` | The primary accent — the vișiniu of embroidery thread. Wordmark's "Ro", filled pills, selected chips, active tab, links that are actions — and, in a List card's foot, the 16px icon beside one: the only icon in the app that is the point. Also the **Food & Drink** tint. |
| `voronet` | `voronet` | `#2A5DA8` | The blue of the painted monasteries. **Historic** tint; the canvas's inline link colour (Show / Forgot password). |
| `pine` | `pine` | `#3F5D4A` | **Services** tint; the APPROVED badge's label. |
| `card` | `card` | `#FFFFFF` | Card ground. Cards sit on white, not on `surface` — the warm ground reads as the page and a card has to lift off it. |
| `parchment` | `parchment` | `#F2EEE6` | The soft fill behind pills and chips. Distance pills; the light stripe of the photo-tile hatch. |
| `gold` | `gold` | `#D9A03D` | A motif thread only — the light in the centre of a stitched star and the hora man's sash. Never text, never a fill. |
| `goldDark` | `gold-dark` | `#B07C1F` | The only shade of gold that carries text: the PENDING badge's label. |
| `badgePending` | `badge-pending` | `#F7EFDD` | PENDING badge fill. |
| `badgeApproved` | `badge-approved` | `#E8EEE9` | APPROVED badge fill. |
| `badgeRejected` | `badge-rejected` | `#F6E7E9` | NOT ACCEPTED badge fill — cherry's own tint, as the other two are tints of the status they stand for. |
| `mapLand` | `map-land` | `#ECE7DC` | The land the map is drawn on — used directly by the web map stand-in. |
| `mapShade` | `map-shade` | `#E9E4DA` | The deeper stripe of the 45° hatch that stands in for a photo not yet chosen or not yet loaded. |

The nine tokens from `card` down are the «Ie» additions. `mapShade` is reserved for a screen
in §4 that has not shipped yet; it is in the palette so that screen lands on-design rather
than inventing a hex.

### Category tints

`categoryColor` in `src/theme.ts` is the one mapping, and it is the only place a category
becomes a colour:

| Category | Token | Hex |
|---|---|---|
| `historic` | `voronet` | `#2A5DA8` |
| `food_drink` | `cherry` | `#8C1D2C` |
| `services` | `pine` | `#3F5D4A` |

A tint arrives as data, so anything carrying it — a card's top border, an eyebrow, a pin, a
chip label — takes it as an inline style value, not as a class.

---

## 2. Motifs

`src/motifs/` is the whole language. Nothing else draws a motif.

- `stitch.ts` — pure geometry. No React.
- `grids.ts` — the pixel grids, copied character-for-character from the canvas. **Edit the
  canvas, not these.**
- `Motif.tsx` — draws a stitched grid through `react-native-svg`.
- `Band.tsx` — `StarBand` and `HoraBand`, a tile run along the x axis.
- `Bird.tsx` — the pasăre, the one motif that stands alone rather than running in a band.
- `Diamond.tsx` — the rhomb, the one part of the language that isn't stitched.

### How a stitch is drawn

A motif is a grid of characters plus a colour map. Every named cell is two strokes crossed
over a square inset from the cell's edges — the X of a real cross-stitch. All cells of one
colour merge into a single path, so a motif is a handful of paths however large the grid.

| Constant | Value | Meaning |
|---|---|---|
| `CELL` | `12` | The side of one cell. Motifs scale by their viewBox, so this only sets path precision. |
| inset | `0.18 · cell` | How far a stitch is held back from its cell's edges. |
| stroke | `0.28 · cell` | Stroke width, round-capped. |

The thread alphabet is one map for every grid — a letter means the same colour everywhere:
`r` = cherry, `b` = ink, `y` = gold, `v` = voronet.

### Inventory

| Motif | Grid | Where it may be used |
|---|---|---|
| `STAR` | 11 × 9, one tile | Header signature and divider, as a band. Never as a single tile. |
| `HORA` | 24 × 13 (a man and a woman, hand in hand) | The two ends of one sentence, as a band: the List's true-empty invitation ("the hora needs dancers") and the Add tab's done state ("the hora has one more dancer"). Nowhere else — the hora is about who has joined, and a third use would make it wallpaper. |
| `BIRD` | 16 × 12 | Sign-in and Onboarding only (§4.7, §4.11). A whole-screen welcome motif, not an accent. |

`mirror(grid)` gives the same motif facing the other way, for the pairs the canvas uses
(the Onboarding bird pair). `repeat(grid, times)` widens a tile; `tiling(band, tile, align)`
says where a run starts and how many tiles it takes.

### Band rules

A band takes its width from the layout, so **it has to be given one**. A band inside a row
or a centred stack measures zero: pass `width`, or stretch it (`self-stretch`) when the
width is the parent's to decide. Until the first layout it is an empty view of the right
height — it reserves its space without drawing, which is also what keeps component tests
SVG-free.

The run overdraws by a whole tile and the band clips, so it never ends mid-stitch and never
seams at a fractional width. **A band ending mid-motif at the right edge is the contract,
not a bug** — do not special-case it.

Tile width is `height × (columns / rows)`: a 14px star band lays 17.1px tiles, a 58px hora
lays 107.1px ones.

| Band | Height | Width | Where |
|---|---|---|---|
| Star, header signature | `14` | from layout | Under the List, Map and Profile headers, and the Add one (§4.5). Runs past the gutter — a signature that stopped at the gutter would read as a rule. |
| Star, divider | `10` | from layout | The strip over a map card; the divider between a place's address and its description. |
| Star, short | `10` | `132` | Sign-in. A fixed width because the parent is a centred column and gives its children none. |
| Star, welcome | `12` | `200` | Onboarding, under the bird pair. The one band that is neither 10 nor 14. |
| Hora | `58` | from layout | The List's true-empty invitation and the Add tab's done state (§4.3, §4.5), and only there. |

Tiling alignment is a separate axis from where the parent puts the band. `StarBand` is
always `align: 'start'` — a short star band is *positioned* centred by its parent, never
centre-tiled. Only `HoraBand` passes `align: 'center'`, which puts a whole tile over the
band's midpoint and steps back by whole tiles, so the dancers read as arranged around the
centre rather than as a strip that starts at the left edge.

### The rhomb

`Diamond` is a rotated square view, not SVG: at the sizes it is used a stitched X would be
mud, and a view can carry a border and a shadow that a path can't. The shadow, and a ring
around a filled rhomb, are the map pin's alone — everywhere else the rhomb sits on the app's
own ground and needs neither. The other thing a border can be is the whole rhomb: a
`transparent` tint and a `border` is an outline.

| Size | Tint | Where |
|---|---|---|
| `6` | `surface` | The dot inside a selected chip. |
| `10` | `transparent`, 1px `line` border | The List card's no-photo tile (§3, Thumbnail); the detail screen's compact header and its failed photo page (§4.4). An outline, because there is nothing there. |
| `10` | `line` | The detail screen's not-found notice. |
| `11` | `cherry` | The Map header's accent; the web map stand-in. |
| `17` (13px core) | category | The map pin, unselected — 2px `surface` ring, shadow `0px 1px 3px rgba(0,0,0,0.3)`. Bare, the web stand-in for the Add pin. |
| `25` | category | The Add pin (§4.5) — 3px `surface` ring, the map pin's shadow. A size up because it is dragged, not just seen. Also the selected browse pin (§4.1), where the size up says which place the card is showing. |
| `44` | `cherry` | Profile's identity mark — `radius` 8, holding counter-rotated initials. The one rhomb big enough to carry content. |

`radius` softens the corners; children are laid over the rhomb's centre **rotated with it**,
so anything that must read upright counter-rotates itself. The rotation belongs to the
shape, and undoing it belongs to the content.

**Sizes come from the canvas as content-box.** CSS there has no border-box reset; React
Native is border-box. A canvas rhomb stated as 13px with a 2px border is 17px of view. Add
the border twice when porting a size.

Every rhomb is `Diamond`, the gallery's page marks included — they were drawn by hand
before anything else needed an outline, and moved over with #32. An outline-only rhomb is a
`transparent` tint and a `border`, which turned out to need no new variant. The place card's
9px tint bullet is gone: a thumbnail stands where it stood.

---

## 3. Component recipes

Numbers below are what shipped. Where a class expresses it, the class is given.

### Card

One shape — white ground, hairline border, soft radius, a 3px band of colour along the top
— worn by place rows, the map's bottom card, and the Profile "your places" rows of §4.8.
The numbers below are the place row's; the variants say where they differ.

- `bg-card` (white), `border border-line`, `rounded-[13px]`
- `borderTopWidth: 3` in the category tint (inline — the tint is data)
- On the List: `mx-[18px] mb-3`

The place row is the one card with two things to press, and they are **siblings**, never one
inside the other — a button inside a button is one a screen reader can't reach.

- **Body** — a `Pressable`, `flex-row gap-3 px-4 pt-3.5 pb-3`, which opens the place. A 72px
  thumbnail (below), then the text column: the eyebrow sharing its line with the distance
  pill (`flex-row items-center justify-between gap-2.5`); the name, `mt-0.5 text-[16px]
  font-semibold leading-[21px]`; the address, `mt-[3px] text-[12px] leading-[15px]
  text-muted` — both held to two lines; and **one** line of the description, `mt-1.5
  text-[12.5px] leading-[17px] text-ink`. Ink where the address is muted: it is prose, and
  set like the address it would read as a second one.
- **Foot** — `flex-row gap-6 border-t border-line px-4`, holding the card actions (below).
- Pressed: `active:opacity-80` on the body. A card can't take a full-bleed press highlight
  without losing its edges, so the part that was pressed dims instead.

The thumbnail, the description and the foot are the List's alone — the two variants below
have none of them.

The map's card varies deliberately: `rounded-xl` (12), `bg-surface` rather than white
(it sits on map tiles, and the app's own paper is what lifts it off them), a 10px star band
across the top instead of a tint border, `overflow-hidden`, body `px-[14px] pb-[14px] pt-[11px]`,
`active:opacity-90` rather than 80 — it dims against map tiles, not against paper — and a
shadow of `0px 4px 14px {ink}1F`, the palette's own colour at 12% rather than a second black.

The Profile card of §4.8 varies less: `rounded-xl` (12) and `px-[14px] py-3`.

### Thumbnail

The place's first photograph, on the left of a List card, where the 9px tint bullet used to
be. A bullet said "this is a place"; a photograph says which one. The category is still said
twice, by the band and by the eyebrow.

- 72 × 72, `borderRadius: 8` — a literal, for the photograph and for the tile that stands in
  for it. Not `rounded-lg`: NativeWind counts a rem as 14 on a device, which makes that 7,
  and the two states of one square should not differ by a pixel.
- The gallery's treatment: `backgroundColor: line`, `contentFit="cover"`, `transition={180}`
- **No photograph, or one that won't load:** the same square as `border border-line` with no
  fill, a 10px outline rhomb at its centre. Not a `line` box, which is what a photograph
  still on its way looks like, and not the canvas's hatch (§5).
- A failed load is remembered against the fetch it happened under, not for good. The List
  tab never unmounts, so pull-to-refresh is how a photograph that timed out once gets asked
  for again.
- Neither labelled nor hidden: it sits inside the body, which is labelled, so nothing of it
  reaches a screen reader either way.

### Card action

A way out of the app from a List card's foot — to the maps app, to the dialer.

- `accessibilityRole="link"`, as a contact row is: it leaves the app
- `flex-row items-center gap-1.5 py-[13px] active:opacity-60` — the padding is what makes it 44
- Ionicons at 16 in `cherry`, then the label, `text-[13.5px] font-semibold leading-[18px]
  text-cherry`
- **Directions** — `navigate-outline`, always there, because every place has a pin.
  `directionsUrl` routes to the **coordinates**, not the address: the pin is what the
  submitter placed, and somebody else's geocoder can put an address somewhere it never was.
- **Call** — `call-outline`, only when `telUrl` makes a URL of the phone field. "Open 7 days"
  is not a number, and a link that goes nowhere is worse than none.
- The drawn label is one word (`actions.directions`, `actions.call`); the accessible one
  names the place (`actions.directionsTo`, `actions.callPlace`), because eight links all
  called "Directions" are one link.
- A device with nothing to open the link says `detail.linkFailed`, as the detail screen does.

### Eyebrow

Uppercase, semibold, `tracking-[1.5px]`, in the category tint.

- `10px` on a card (`text-[10px]`)
- `11px` on the detail screen, `leading-4` — the same eyebrow at the scale of a screen
  rather than a row
- `muted` instead of a tint when the eyebrow labels a field rather than a category (the
  contact rows), or says where a form is rather than what a place is (the Add form's step
  line, §4.5)

Form field labels are a different mark: `11px` semibold, `tracking-[0.8px]`, `ink` —
`FormLabel` in `src/components/Form.tsx`. Use them only above an input or a group, or as the
toggle that folds a group away (§4.5's contact details, §4.8).

### Pills

| Pill | Recipe |
|---|---|
| Primary (filled) | `rounded-full bg-cherry`, label `text-[14px] font-semibold text-surface`, `px-6 py-3`, `active:opacity-80`. The one thing to do on a screen that failed. |
| Secondary (outlined) | `rounded-full border-[1.5px] border-cherry`, label `text-[14px] font-semibold text-cherry`, `px-6 py-[11px]`, `active:opacity-70`. An invitation rather than the app insisting. |
| With an icon | Either recipe plus `min-h-[44px] flex-row items-center justify-center gap-2`, a 16px Ionicon ahead of the label in the label's colour. The label wraps rather than truncates, so the pill grows with enlarged text. The filled one takes the outline's `border-[1.5px] border-cherry` and `py-[11px]` too: Yoga won't flex a pill below its padding and border, so without it an outlined pill beside a filled one comes out 3 wider. Only the detail screen's actions (§4.4) carry one. |
| Distance | `rounded-full bg-parchment px-[9px] py-1`, label `text-[11px] font-semibold text-muted` with `fontVariant: ['tabular-nums']`. On a List card it shares the eyebrow's line, at the right — the same x in every card, and none of the name's width. |

Tabular figures are the point of the distance pill: a column of them lines up down the list.
Where there is only **one** distance on a screen, drop the pill and set the number bare —
`text-[12px] font-semibold text-muted`, still tabular. A pill is for a column that has to
align.

Distance copy comes from `units.miles` / `units.milesBelow` via `milesLabel`; the decimal
separator is i18next's, so Romanian gets `0,6`. Never `toFixed`.

### Chip

A pill that carries a filter.

- Both states: `flex-row items-center gap-1.5 rounded-full border px-[13px] py-1.5`,
  `active:opacity-70`
- **On**: `bg-cherry`, `borderColor: cherry`, a 6px `surface` rhomb, label
  `text-[12px] font-semibold` in `surface`
- **Off**: transparent, `borderColor: line`, label `text-[12px] font-medium` in the
  category's tint — the colour code is legible before you commit to it
- The row: horizontal `ScrollView`, `gap: 8`, `paddingHorizontal: 24`, `paddingVertical: 12`,
  `accessibilityLabel` from `filters.label`
- Each chip: `accessibilityRole="button"` and `accessibilityState={{ selected }}`

### Map control

A pill that drives the map's camera — §4.1's Closest places and location control. The map's
furniture, not the app's voice, so it takes none of the cherry.

- `min-h-[44px] max-w-full flex-row items-center gap-2 rounded-full border border-line
  bg-surface px-4 py-2 active:opacity-80`, and the map card's shadow (`0px 4px 14px {ink}1F`)
  — it stands on the same tiles the card does
- A 16px Ionicon in `muted`, then the label `shrink text-[13px] font-semibold leading-[17px]
  text-ink`. The label wraps rather than truncates; `max-w-full` keeps the pill inside the
  screen when enlarged text wants more
- Waiting: a small `ActivityIndicator` in `muted` where the icon was, `disabled`, and
  `accessibilityState={{ disabled: true, busy: true }}`
- The drawn label is short (`map.closest`, `map.locate`, `map.detroit`); the accessible one is
  a whole sentence (`map.closestLabel`, …) saying what the press will show

### Clear filters

Every chip off in one tap — back to the empty set, which already means "show everything",
so there is still no "All" chip. `ClearFilters` in `src/components/CategoryChips.tsx`, which reads the shared filter itself:
bare `text-[13px] font-semibold text-cherry` reading `filters.clear`, `min-h-[44px]
justify-center active:opacity-60`, `accessibilityRole="button"`. Bare text rather than a
chip: it is not a filter, and a pill beside the chips would read as a fourth one. It
appears only where a chip is on.

Where the screen has room for the ask to be the whole notice — the List's filtered empty —
it is an outlined pill instead (§3, Pills), `mt-1` under `filters.noMatch`, with
`min-h-[44px] justify-center` — the bare recipe lands a point or two short of 44.

### Result row

The List's line under the chips (§4.2): how many places the chips left, and Clear.

- `-mt-3 min-h-[44px] flex-row flex-wrap content-center items-center justify-between
  gap-x-4 px-6`. The `-mt-3` pulls it into the chip row's bottom padding so it reads as the
  chips' own line; the 44 is Clear's target, and while there is a count the row keeps it
  with no chip on too, so turning the first chip on doesn't push the list down. `content-center` keeps a lone count
  centred in that height — a wrapping row packs its line to the top otherwise. Enlarged
  text wraps Clear under the count rather than truncating either.
- Count, left: `list.count` — `text-[12px] text-muted`, tabular figures, and the only
  polite live region (`accessibilityLiveRegion="polite"`): announcing the whole row would
  read Clear out on every refilter. It counts every filtered result, not the rows on
  screen. None while the places are loading or have failed — "0 places" there would be a
  claim the app can't yet make — and none over the true empty (§4.3).
- Clear, right, only while a chip is on (§3, Clear filters).

Plurals are i18next's, from the language's own rules: Romanian has three forms — `1 loc`,
`2 locuri` (also 0 and 101–119), `20 de locuri`. Hermes has no `Intl.PluralRules`, and
without one i18next quietly counts every language the English way, so `src/i18n/index.ts`
imports the `intl-pluralrules` polyfill before anything else.

### Wordmark

`Ro` in cherry, `Spot` in ink, bold, negative tracking. It is a name, not copy — it is
identical in both locales and never goes through i18next.

- List (the top of a page): `text-[30px] leading-[30px] tracking-[-0.5px]`
- Map (a strip above a map that wants the rest of the screen): `text-[22px] leading-[22px]
  tracking-[-0.3px]`

### Screen states

`src/components/ScreenState.tsx`. One set for every screen, because two screens that fail
for the same reason should not look like two different problems.

- `ScreenNotice` — `items-center gap-3 px-6 py-16`
- `Loading` — `ActivityIndicator` in cherry over `text-[13px] text-muted`
- `LoadFailed` — `cloud-offline-outline` 28 in muted, `text-[15px] text-ink`, then a primary
  pill reading `actions.retry`
- `RetryPill` — the secondary pill reading `actions.retry`, at `min-h-[44px]`, its label
  free to wrap. For asking again for something smaller than a screen — a photograph, or all
  of a place's photographs — where the screen around it loaded and already has its filled
  pill. Label it when the word alone doesn't say what is retried (`detail.retryPhoto`).

### Measures

The app has more than one gutter, and each earns its width.

| Measure | Where |
|---|---|
| `24` | The app gutter: headers, chip rows, notices. |
| `28` | Sign-in. One centred column of fields, narrower than the app gutter so the form reads as a card without one. |
| `18` | The List's card margin — cards are wider than the text above them. |
| `22` | The detail body. Prose set to a card's measure reads as a card that lost its border. |
| `14` / `12` | The map card: 14 from the left and right edges, 12 from the foot. |
| `36` | The web stand-ins for the two maps (`PlacesMap.tsx`, `PinMap.tsx`). |
| `40` | The empty invitation. Centred text at the app gutter reads as a paragraph that lost its page. |

### Accessibility

The restyle costs a screen reader nothing, and neither should the next change.

- Chips are buttons with `accessibilityState={{ selected }}`.
- The List's result count is a polite live region, and nothing else in its row is (§3,
  Result row). Android only: iOS has no live regions, and says nothing on a refilter.
- A contact row is `accessibilityRole="link"` labelled `"{label}: {value}"`.
- A photo is labelled `Photo {index} of {total}` — a gallery a screen reader can't count is
  a photo that might be the only one.
- The map card is one button labelled with the **place's name**, not "open place": the card
  is the place. A List row's body is a button labelled `"{category}, {name}, {address},
  {distance}"` — what the row read as when its own text was its name. It is labelled now
  because its text includes a description somebody else wrote, at whatever length they
  wrote it, and a row is not the place to hear all of it. The category goes in sentence
  case: an all-caps label is spelled out letter by letter. Label a card explicitly only
  where the text inside it wouldn't do.
- A List card's actions are links, siblings of the body, each named with its place. The
  detail screen's Directions and Call pills reuse those names.
- A disclosure is a button with `accessibilityState={{ expanded }}`, labelled with what it
  holds rather than what it does (§4.5's contact details), and at least 44 tall.
- Touch targets reach 44 through padding, not `hitSlop`, where the control hangs off an
  absolutely positioned parent — Android clips touch at a parent's bounds.

---

## 4. Screens

### Built

#### 4.1 Map — `src/app/(tabs)/index.tsx`

Header, band and chips **stacked above** the map, not floating over it, so the map itself
stays unobstructed. Header row: 22px wordmark at the 24 gutter, an 11px cherry rhomb
opposite, `pb-2.5 pt-1.5`. Then the 14px star band edge to edge, then the chip row. The map
fills the rest.

Pins are rhombs, no stem: category tint, `surface` ring, `0px 1px 3px rgba(0,0,0,0.3)`,
anchored `{x: 0.5, y: 1}` so the rhomb's lower vertex marks the coordinate. Black in the
shadow rather than `ink` — a pin has to lift off map tiles whose colours aren't ours to
match. `tracksViewChanges` stays on: switching it off is the usual fix for hundreds of
markers, but on Android it can leave a custom pin blank on first paint, and the launch
dataset is 10–20 places.

**Browse selection.** One pin is always the selected one while there are places: the one
the user tapped, or until they tap one, the nearest. The selected pin is the Add map's rhomb
— **25px with a 3px ring**, raised `zIndex` — and every other pin stays **17px / 2px**. No
animation between them. A tap selects without moving the camera (`moveOnMarkerPress={false}`)
and without leaving the map; the card is what opens the place. Empty-map taps and panning
leave the selection alone.

- Until the user picks a pin, the selection follows the nearest place — including when
  location resolves and the list re-sorts. After a pick, a re-sort keeps it.
- A refresh or a chip that takes the picked place off the map **forgets** the pick: the
  card falls back to the nearest remaining place, and lifting the chip again does not bring
  the old pick back. No places, no selection and no place card.

Both sizes draw inside **one 44 × 40 box**, the rhomb stood on its foot. Android draws a
custom marker into a bitmap the size of its view, so a rotated square overhangs and clips
unless the box is sized to its diagonal, and a box that changed size with the selection
would move the tip. The marker's `key` carries the selection: Android stops re-drawing a
marker's view once it settles and only starts again when the view's own size changes, so a
pin resized in place keeps its old image. A remount is a new image.

The foot of the map holds exactly one card, and three things can stand in it:

1. **Error** — the notice and a bare cherry `actions.retry`.
2. **Selected place** — the tapped pin's place, or the first of the distance-sorted visible
   list (chips included: a filtered map's nearest place is the nearest place the user asked
   to see). Eyebrow, name `text-[16px] leading-5`, address, bare distance. The whole card
   is one button to that place's detail, named `map.card` (name, category, address — a
   card picked from a pin the reader can't see has to say which place it is) with the hint
   `map.cardHint`.
3. **Empty** — `filters.noMatch` when chips are on, `map.empty` when they aren't. Blaming
   the chips for an empty dataset would send the user hunting for a filter to undo. The
   chips' empty carries Clear (§3) opposite the notice, in a `flex-row flex-wrap` that puts
   it under the notice when the text is enlarged.

The Map header carries **no count**: the pins are the count, and the header is a strip above
a map that wants the rest of the screen.

While the query is pending, no card shows.

**Framing what's close.** The map opens on Metro Detroit (`DEFAULT_REGION`) and is then
framed once on the nearest places. One rule, `closestFraming` in `src/framing.ts`, runs in
three places: the opening, every chip change, and the Closest places control.

- It fits the **nearest five** of the filtered, distance-sorted places. The user's own
  position joins the fit only with a **device fix** and only when the nearest place is
  **≤ 50 miles** away — otherwise the frame is a state of empty map with a dot at one end.
  The Detroit fallback never joins: it is where distances are measured from, not where
  anybody is.
- One place and no user in the fit: `nearbyRegion` around it, the neighbourhood zoom.
- Afterwards the selection stays only if it is among the five framed; otherwise the card
  goes back to following the nearest.
- The **opening** frame runs once, when the map reports ready and has a size, the places
  have arrived and the card they bring has been measured, and location has answered (fix or
  not) — no interim move, no timeout. A fit made before the card's layout would clear a foot
  of nothing. Anything the user does
  to the map first cancels it for good: a pan or pinch (`onPanDrag`, or
  `onRegionChangeStart` with `isGesture`), a pin tap, or a press on an enabled control. The
  camera's own moves and a press on the disabled location control don't count. A chip
  change before the opening doesn't frame; the opening frames the filtered set itself.
- Nothing else moves the camera: not a background refresh, not a later location change, not
  a fallback selection.

The fit is computed as a region (`fitRegion`) and handed to `animateToRegion`, not done with
`fitToCoordinates`: on Android that call adds its edge padding to the map's own padding and
leaves it there, which would lift the Google logo and shift every later move. A fitted point
keeps a pin's box clear of the map's edges (52 at the top, 36 at the sides).

**Controls.** A right-aligned column of map controls (§3) stands `mb-2.5` above the card,
`gap-2` apart — Closest places, then (on the fallback) turning location on, then location —
so the Google logo at the card's left shoulder stays in sight.

- **Closest places** (`scan-outline`) runs the framing rule. Hidden when there are no results.
- **Location**, by what location has said: still asking → "My location", disabled and busy,
  a spinner for its icon; a device fix → "My location" (`locate-outline`), which recentres
  on `nearbyRegion` of the device; denied or failed → "Detroit" (`business-outline`), which
  recentres on `DEFAULT_REGION`. It never asks for permission itself, and never calls the
  fallback "my location".
- **Turning location on**, only on the fallback, above Detroit: "Use my location"
  (`navigate-outline`) asks again — or retries a failed fix, offering on Android to switch the
  device's location on — and "Location settings" (`settings-outline`) opens the system
  Settings once the OS won't show the prompt (Android after repeated denials, iOS after the
  first). It counts as the user's press. The fix it asked for recentres on `nearbyRegion` of
  the device when it comes — from the prompt, or from Settings on the way back into the app —
  unless the user moved the map or picked a pin first; a fix nobody asked for here moves
  nothing. A denial settles the press; a return from Settings without a grant doesn't, so the
  press stays outstanding until a fix or a touch on the map. A fix gives up after 15 s
  (`FIX_TIMEOUT_MS`) and leaves the fallback in place. #34.
- Neither control touches the selection, and nor does panning.

The screen measures two heights. The **card** and its gap become `footInset`, which the map
takes as bottom `mapPadding`: that keeps the Google logo — which the Maps terms require to
stay visible — above the card, and centres the map on the part of it the user can see. The
**whole foot**, controls included, becomes `fitInset`, and a fit clears the difference
between the two on top of the padding — counted once, not twice. Don't position the card or
the controls without going through that wrapper.

Web has no map: `src/components/PlacesMap.tsx` says so on `bg-map-land` under an 11px cherry
rhomb, and points at the List tab. Web is a dev convenience, not a release target.

#### 4.2 List — `src/app/(tabs)/list.tsx`

30px wordmark and `list.subtitle` at the 24 gutter, the fallback-origin note under them when
— and only when — the origin has resolved to the fallback, and under the note, bare as Clear
is, its way out: "Use my location" (`list.enable`), or "Open settings" (`list.settings`) once
the OS won't ask again. The same `enableLocation` as the Map's control (#34). Then the 14px
star band edge to edge, then the chip row. Rows are cards at `mx-[18px] mb-3`; the card's
body navigates and its foot leaves the app (§3, Card). Pull-to-refresh is the list's refetch.

**The band and the chips pin; the masthead scrolls away.** A filter you have to scroll back
up to reach is one you stop using halfway down the list. The pinned block is `bg-surface`,
because cards pass under it, and it is the band *and* the chips so that the signature is
under the header in both states — pinned, it is the Map tab's stack. Nothing shrinks or
fades on the way: the wordmark leaves with the scroll, which is not an animation.

Under the chips, pinned with them, the **result row** (§3): the count on the left, Clear on
the right while a chip is on. There is no count while the places are loading or have failed,
nor over the true empty — the hora already says there is nothing — so there the row shows
only when a chip is on, and holds Clear alone.

**A refilter from the pinned bar starts the new list at its top** — the list is nearest
first, and left at its old depth it would open on the far end of a shorter list. It scrolls
(unanimated) to the foot of the masthead, not to zero: that is exactly where the bar pins, so
the chips don't move under a finger that is still choosing among them. With the masthead still
on screen there is nothing to correct and nothing moves.

The mechanism is a `SectionList` with one section — the masthead is its
`ListHeaderComponent`, the band and chips its section header, and
`stickySectionHeadersEnabled` is set outright because Android's default is off. While the
query is pending or has failed there is no list, and the same two blocks stand above the
notice unpinned.

#### 4.3 List, empty — `EmptyInvitation` in the same file

**Only the true empty gets the hora.** A list emptied by the user's own chips gets
`filters.noMatch` in a `ScreenNotice` instead, over an outlined pill reading `filters.clear`;
offering to add a place there would answer a question nobody asked. The pinned row's Clear
is up by the chips; the pill is where the eye is. The true empty offers no Clear — there is
nothing to clear.

Centred in what's left below the header, at the 40 measure: a stretched 58px hora band,
`mt-[26px]` to `list.empty` (`text-[17px] font-semibold`), `mt-[7px]` to `list.emptyHint`
(`text-[13px] leading-[19.5px] text-muted`, centred), `mt-6` to an outlined pill reading
`list.emptyCta`, which pushes to `/add`.

The band is stretched rather than dropped straight in — it measures itself, and a centred
column gives its children no width to measure. The list's `contentContainerStyle` carries
`flexGrow: 1` so the invitation has a full screen to centre in.

Both empties are the list's **footer**, not its `ListEmptyComponent`, and the footer's
wrapper carries `flexGrow: 1` too. A section's header counts as an item, so a list that still
shows its chips is never empty as far as the list is concerned — and the chips have to stay,
because they are the way out of the over-filtered one.

#### 4.4 Place detail — `src/app/place/[id].tsx`

Full-bleed photo hero, hard against the top of the screen: the photographs lead, and the
chrome that would frame them floats over them. The back chip is a 32px `surface` circle,
`0px 1px 4px {ink}26`, `chevron-back` 20 in ink, with 6px of padding around it for the 44
target. Over a hero it **floats**: absolute, held clear of the status bar by a top-edge
`SafeAreaView` (not `useSafeAreaInsets`, which needs a provider this pushed screen shouldn't
depend on), rendered after the scroll view so it paints over the photographs. It floats
**only over a real photograph** — everywhere else (the compact header below; loading, error
and not-found) it is the first thing in the flow, at `pl-2`, so at enlarged text nothing
runs under it. "Over a photograph" means over the gallery, whatever state its page is in: it
still floats over a page that is loading or failed, whose content is centred in a 4:3 page
tall enough to stay clear of the chip at 2× text.

**The compact header** stands where the hero would when there is no photograph to show — a
place nobody has photographed yet, or one whose every photograph failed. A 4:3 box of
nothing was a third of the screen that read as "still loading". Recipe: full-bleed `bg-card`
from the very top edge, closed by `border-b border-line`; inside a top-edge `SafeAreaView`,
the back chip in flow, then a message row — `min-h-[96px] justify-center py-4` at the 22
measure, a 10px outline rhomb (`Diamond`, `transparent`, `line` border) beside a column
holding the message `text-[13px] text-muted` at `HEADER_LINE` (18), wrapping. The rhomb sits
in a box one text line tall (`HEADER_LINE × fontScale`), so it marks the message's first line
rather than the middle of the message and its Retry. No photos says `detail.noPhotos` and offers
nothing; every photo failed says `detail.photosFailed` with a `RetryPill` under the message,
in the column, so it has the column's width to wrap in. That Retry asks for every photograph
again, in a gallery that starts over at the first page.

Body at the 22 measure: 11px eyebrow, name `text-[23px] leading-[29px] font-semibold`,
address line, the actions at `mt-4`, a 10px star band divider at `my-4`, then the
description as written by whoever submitted it. Contact rows follow — label over value,
icon at the right, separated by a **top** hairline so the first row's rule doubles as the
line under the description.

**The actions** sit straight under the address: most visits to a place end in going there
or ringing them. **Directions** is a primary pill with `navigate-outline`, to the pin's
coordinates through `directionsUrl`; **Call** beside it is a secondary pill with
`call-outline`, only when `telUrl` makes the phone dialable. Both are pills with an icon
(§3), `accessibilityRole="link"`, named like the List card's actions (`actions.directionsTo`,
`actions.callPlace`), and a link the device can't open gets `detail.linkFailed`.

Two pills share the width equally (`flex-1`, 10 gap) while **both** icon-and-label pairs fit
in half of it, and stack full-width in a column when either doesn't. Fit is **measured**, not
read off the font scale: each pill is laid out a second time out of sight — absolute, `opacity:
0`, hidden from accessibility — at its natural width, and that copy is compared with half the
row. The visible pills can't be measured for this, because a stacked pill always fits. Until
the row has a width they sit side by side. Directions alone is full width and measures
nothing. The phone contact row stays below, unchanged: the pill is the action, the row is
where the number is written down.

The body ends in **Report a problem**: muted text, `text-[13px] text-muted underline`, at
`mt-5`, `self-start`, `min-h-[44px] py-2.5` for the target. It was an outlined pill; next
to the actions a third pill would compete with Directions on a screen that is about the
place, and the underline is what still says it can be pressed. It pushes §4.10 whoever is
signed in — that screen asks for the account, so signing in comes back to the report and
not to here. A place that isn't there has no report action.

The distance appears **only once the origin has resolved** — while the permission prompt is
still up there is nothing to measure from but a guess about the reader. It is a nested
`Text` inside the address line rather than a longer string: one node the address, one the
measurement. No fallback-origin caveat here; the List says it once over a whole column of
numbers, and this screen has one.

Photos: one per page at the full width of the screen, snapped by `snapToInterval`, faded in
over a `line` box — that grey box is **loading**. Page marks are centred 6px rhombs — ink for
the page you're on, a `line` outline otherwise — and only appear past one photo.

A photograph that fails keeps its page: the same width and 4:3, the page marks still count
it, and you stay on it. The page turns `bg-card` — white, so "not coming" never looks like
the grey of "still coming" — with a centred 10px outline rhomb, `detail.photoUnavailable` in
`text-[13px] text-muted`, and a `RetryPill` labelled `detail.retryPhoto` ("Try photo 2
again": a screen reader walks every failed page). Retrying draws the page as a photograph
again, which mounts a fresh image and asks for it anew. When **every** page has failed the
gallery gives way to the compact header above.

Which pages failed lives on the screen, not in the gallery, because all-failed changes what
stands at the top. The body is keyed by the place's id and its photo paths, so another place
— or this one after an edit — starts from the first page with nothing marked failed.

A place that isn't there gets a 10px `line` rhomb, `detail.notFound` and
`detail.notFoundHint` — a pending place and a deleted one look the same from out here, and
the copy says both rather than guessing.

#### 4.5 Add — `src/app/(tabs)/add.tsx`

The form and pin steps live in `src/components/PlaceEditor.tsx`, which the edit screen (§4.9)
shares; the tab itself is the sign-in gate, the done state, and what to do with a submission
that went through. Everything below describes the shared component as the Add tab uses it.

One screen in three steps — form, pin, done — sharing one draft. Not three routes: none of
them is somewhere a link should land, and the draft has to outlive the pin step in both
directions (back to fix a typo, or a send that failed). Only a submission that went through
clears it.

Every step keeps the **page header** at the 24 gutter — `text-[24px] font-bold
tracking-[-0.4px]` title over a `text-[12.5px] text-muted` subtitle (`add.subtitle`: the
moderation queue is stated up front, not after submitting) — and the 14px star band edge to
edge under it. Under the subtitle, `mt-1`, the step in the muted eyebrow (§3: `text-[11px]
font-semibold uppercase leading-4 tracking-[1.5px] text-muted`, sentence-case
`accessibilityLabel`):
`add.steps.details`, "Step 1 of 2 — Place details", on the form, and `add.steps.pin`, "Step
2 of 2 — Confirm location", on the pin. The done state has none — it isn't a step.

**Reading the session / anonymous** — as Profile (§4.8): `Loading` first, so the gate never
flashes at someone already signed in, then the invitation at the 40 measure with a primary
pill to `/sign-in`. This and a report (§4.10) are the only places the app asks for an
account.

**Form** — a `ScrollView` at the 24 gutter, `gap: 14`, `paddingVertical: 18`,
`keyboardShouldPersistTaps="handled"`. Fields in order: **NAME, CATEGORY, ADDRESS,
DESCRIPTION, PHOTOS**, then the **contact details** disclosure, then Continue — name first
because it is the one thing the submitter certainly knows, and every required field before
the optional ones, so the form looks as short as what it asks for.

**Contact details** — phone, website and social page fold under one toggle, drawn as a form
label rather than a button: a `Pressable` row, `min-h-[44px] flex-row items-center
justify-between gap-2`, the label in the form-label mark with its normal-weight muted
suffix, and a 16px `chevron-down` / `chevron-up` in muted at the right. It reads "ADD CONTACT
DETAILS · optional" while all three are blank and "CONTACT DETAILS · 2 added" once any holds
something (`add.contact.*`; Romanian counts `câmp` / `câmpuri`) — trimmed and non-blank,
valid or not, so a typo never hides behind "optional". `accessibilityRole="button"`,
`accessibilityState={{ expanded }}`, labelled sentence-case `"{label}, {suffix}"`. The three
fields sit under it at the form's `gap: 14` when open, unchanged from before. It starts
closed on a blank draft and open on one that already has contact details (an edit, §4.9).
Closing it keeps every value; clearing all three changes the label back but leaves it open;
**Continue** opens it when a problem is inside — a problem nobody can see is one nobody can
fix. Open or closed, it survives the round trip to the pin.

Each field is a label over a control, `gap-1.5`. The label is the form-label mark (§3),
stored sentence-case and uppercased by class. Over a text input it is **hidden from screen
readers** — the input carries the same words as its `accessibilityLabel` (`"Phone
(optional)"` for the optional three), and a field announced twice is worse than once. Over
a group (the chips, the photo tiles) nothing else names the group, so the label is read,
suffix included. A label may carry a
normal-weight muted suffix: `· optional`, or the photos rule `· 1–5 required`. Under the
control sits one `text-[11.5px]` line: the field's problem in cherry
(`accessibilityLiveRegion="polite"`), else its hint in muted (the address has one: "You'll
confirm the pin on a map next"). Problems appear on **Continue**, all at once, and a field's
problem clears the moment that field is edited.

- **Text input** — `border border-line rounded-[10px] px-[13px] py-[11px] bg-card`, value
  `text-[13.5px] text-ink`, placeholder muted. `maxLength` carries the table's ceilings
  (120 / 300 / 2000), so "too long" is prevented rather than complained about.
- **Description** — the same input, `multiline`, `minHeight: 56`, `lineHeight: 20`.
- **Category** — the §3 chip (`CategoryChip`), wrapped `gap-2`, single-select: a place has
  one category, so pressing another moves the selection rather than adding to it.
- **Photos** — 52px `rounded-lg` tiles, `gap-2`, wrapping. A chosen photo is the image with
  a 16px `surface` circle and an 11px `close` at its top right; the whole tile is the button
  ("Remove photo 2"). The add tile is a `1.5px dashed line` border with a 20px muted `add`,
  an `ActivityIndicator` while the picker's choices compress, and is gone at five.

A primary pill closes the form, `py-3`, label 14px: `add.continue`. It checks the draft,
geocodes the address on the device, and opens the pin.

**Pin** — the header's title becomes `add.pin.title`, its subtitle the address as typed (two
lines at most), with a `chevron-back` 22 at `p-[11px]` (and `-ml-[11px]`, so the ink sits on
the gutter) labelled `add.pin.edit`. The map fills the middle: `PinMap`, one draggable
**25px** rhomb in the category tint with a 3px `surface` ring — the browse pin a size up,
because this one has to be caught by a thumb — anchored at its foot. Hold-and-drag moves it
and so does a tap on the map; the platform's drag alone is a gesture nobody guesses. A found
address opens at street level (`streetRegion`, a few blocks) so an entrance can actually be
marked; a missed one opens wide (`nearbyRegion`), because that pin has a way to travel. The foot
is `px-6 pb-4 pt-3.5 gap-3`: one `text-[12.5px] leading-[18px]` line — the hint in muted,
or in cherry the geocoder's miss or a failed send — over the primary pill,
`add.pin.submit`, which is `disabled` and shows an `ActivityIndicator` while sending.

When the address doesn't geocode, the pin starts at the user's origin (`useOrigin`) and the
line says it needs moving. A miss is not a dead end; it is why this step exists.

Web has no map: `src/components/PinMap.tsx` draws the rhomb on `bg-map-land` with the
coordinates in tabular figures and says the pin can't be moved from there.

**Done** — the empty List's column (§4.3) answering itself: a stretched 58px hora band at
the 40 measure, `mt-[26px]` to `add.done.title` (`text-[17px] font-semibold`), `mt-[7px]` to
the hint (`text-[13px] leading-[19.5px] text-muted`) — "the hora has one more dancer" — and
`mt-6` to an outlined pill, `add.done.again`, back to an empty form.

#### 4.6 Tab bar — `src/app/(tabs)/_layout.tsx`

`surface` ground, `line` top border, cherry active and muted inactive, labels at 11px with
`0.2px` tracking, Ionicons outline icons. Four tabs in order: Map, List, Add, Profile.
Headers are off — every screen draws its own.

#### 4.7 Sign-in — `src/app/sign-in.tsx`

**One screen in two modes**, sign in and create an account, swapped by the footer. Every
string comes from `auth.signIn.*` or `auth.signUp.*` under the same keys, so the two sets of
words sit side by side rather than in two places that have to be kept agreeing.

A centred column at the 28 measure, in a `ScrollView` with `flexGrow: 1` and
`keyboardShouldPersistTaps="handled"` — without the latter the first tap on the pill only
dismisses the keyboard, and the user presses "Sign in" twice to sign in once.

A 96px `BIRD` (72 tall — the grid's own 4:3), title `text-[26px] leading-[31px] font-bold
tracking-[-0.4px]` at `mt-[18px]`, subtitle `text-[14px] leading-[21px] text-muted` at
`mt-[7px]`, then a 132px-wide 10px star band at `my-5`.

Email and password are the **10px-radius white input**: `border border-line rounded-[10px]
px-[13px] py-3 bg-card`, value `text-[13.5px] text-ink`, placeholder in muted, `gap-2.5`
between them. Their labels are `accessibilityLabel`s rather than drawn text, and are written
sentence-case for that reason — a screen reader spells an all-caps string out letter by
letter. The password carries a `text-[12px] font-medium` `Show` / `Hide` in `voronet`
inside its right edge, with 64px of padding reserved for it.

A notice line sits between the fields and the pill at `mt-3`, `text-[12.5px] leading-[18px]`
— cherry for a refusal, muted for the "check your inbox" note — and is
`accessibilityLiveRegion="polite"`, because the field the user is looking at is not where
the answer appears. The words are the app's, never the server's: `src/data/auth.ts` maps
Supabase's error codes onto a short list of reasons and the screen reads
`auth.errors.<reason>`.

A primary pill closes the form at `mt-3.5`, `py-[13px]`, label 15px. While a request is in
flight it is `disabled` and trades its label for an `ActivityIndicator` in `surface` — two
taps on a slow connection are two accounts. Footer at `mt-5`: `text-[12.5px] text-muted`
with the other mode in `text-[12.5px] font-semibold text-cherry`.

Top left, a back chip: `chevron-back` 22 in ink with `p-[11px]` for the 44 target. Not the
detail screen's floating circle — there are no photographs here to lose a control against.
Browsing needs no account, so this screen must never be a wall.

#### 4.8 Profile — `src/app/(tabs)/profile.tsx`

Page header (`text-[24px] font-bold tracking-[-0.4px]`, no subtitle) at the 24 gutter, then
the 14px star band edge to edge. Under it, one of three states.

**Reading the session** — the `Loading` screen state with `profile.loading`. The stored
session takes a moment to come back off the device, and drawing the invitation first would
flash "sign in" at someone who already is, every time they opened the tab.

**Signed in** — the body at the 24 gutter, `py-[18px]`, in a `ScrollView` whose content
container has `flexGrow: 1`: identity at the top, then "your places", then the language, and
the account block at the foot of a short screen (`mt-auto`, with `pt-6` so a long one still
keeps 24 above it) or below the cards on a long one. Identity is the 44px **cherry rhomb with an 8px corner radius**, initials
counter-rotated inside so they read upright, `text-[15px] font-semibold text-surface`,
`gap-[13px]` to the address in `text-[16px] font-semibold`. There is no name to show until
profiles exist, so the address takes the name's line and the initials are read off it —
two letters where a separator splits the local part (`ana.pop@` → AP), one otherwise. The
rhomb is hidden from screen readers: it abbreviates the line right beside it.

The account block is pushed to the foot: "Sign out" as `text-[13.5px] font-semibold
text-cherry`, `self-start`, with `py-[13px]` for the 44 target. The tab redraws from the
session state rather than from the button, so signing out needs no navigation.

A sign-out that fails says so in `text-[12.5px] text-cherry` above it — and that message is
narrower than it looks. supabase-js treats "there was nothing to revoke" as success, and on
any other failure it drops the local session *before* reporting the error, so the usual
network failure still ends signed out and this tab has already redrawn. The message is for
the one case left: the client could not read the session it was asked to end, and the user
really is still signed in.

**Anonymous** — a centred column at the 40 measure: `profile.anonymousTitle` in
`text-[17px] font-semibold`, `mt-[7px]` to the hint (`text-[13px] leading-[19.5px]
text-muted`, centred), `mt-6` to a primary pill reading `profile.signIn` that pushes
`/sign-in`. It states the bargain rather than blocking on it. Under it, at the foot and the
24 gutter (`px-6 pb-[18px]`), the **language** block — most people never sign in, and they
read the app too. The canvas only drew the signed-in page; this is the addition.

**Your places**, `mt-6`: the form
label ("YOUR PLACES"), a `text-[11.5px] text-muted` line under it saying that an edit goes
back for review — the rule stated before it can surprise anybody — then §3 cards at `mt-1.5`
inside the block's own `gap-1.5`, so 12 separates the cards from the hint and 6 the hint from
the label. Cards at `gap-2`, `rounded-xl`, `px-[14px] py-3`, name `text-[14px] font-semibold` over locality
`text-[11.5px] text-muted`, both `numberOfLines={1}`, and a **status badge** opposite:
`rounded-full px-2.5 py-1`, `text-[10.5px] font-semibold uppercase tracking-[0.5px]`,
PENDING in `goldDark` on `badgePending`, APPROVED in `pine` on `badgeApproved`, NOT ACCEPTED
in `cherry` on `badgeRejected`. The card's 3px top border stays the **category** tint, not
the status — a place doesn't change what it is by being in a queue.

The locality is `locality(address)` (`src/address.ts`), not the address: the card already
says which place this is, so the line under the name only has to say roughly where.

A card is a button whose accessible name is its own text — name, town, status — with
`profile.places.edit` as its `accessibilityHint`, and it pushes `/edit/<id>`. The block's
three other states are small rather than screen-sized, because they sit inside a screen that
has other things on it: a spinner beside `text-[12.5px] text-muted` while it loads, that
muted line plus a `text-[13.5px] font-semibold text-cherry` `actions.retry` at `py-[13px]`
when the read failed, and one muted line inviting a first submission when there is nothing.

**Delete account** (#10) sits right under "Sign out": plain `text-[12.5px] text-muted`,
`self-start`, the same `py-[13px]` 44 target, pulled up by `-mt-3` against the block's
`gap-3` so the two targets meet — their padding already puts 26 between the labels. Deletion is a store
requirement, not a feature — it is present, and it is quiet. A press only asks: the link
becomes a §3 card without a category border (`rounded-xl border border-line bg-card
px-[14px] pt-3`) holding `profile.delete.title` in `text-[14px] font-semibold`, what goes
with the account in `text-[12.5px] leading-[18px] text-muted`, then two text buttons at
`py-[13px]`, `gap-x-5`: `profile.delete.confirm` ("Delete my account") in cherry and
`profile.delete.cancel` ("Keep my account") in ink — each names what it does, where
"Cancel" would not say which of the two it cancels. An inline card rather than a system
alert: it speaks in the app's type and works the same on every platform, the web preview
included. The pressed link unmounts, so the card's title takes screen-reader focus. While the request is out the buttons give way to a spinner and
`profile.delete.deleting`; a failure keeps the card open with `profile.delete.failed` in
`text-[12.5px] text-cherry` above the same buttons. Success needs no navigation — the
session ends and the tab redraws as the invitation, as after a sign-out.

**Language** (#13), `mt-6` under "your places": the form label (`profile.language`,
"LANGUAGE"), `gap-2`, then a segmented pill — `flex-row rounded-full border border-line
bg-card p-[3px]`, two `flex-1` halves at `py-2`, the selected one `rounded-full bg-cherry` with
a `text-[13px] font-semibold text-surface` label, the other `text-[13px] font-medium
text-muted`. English first, as on the canvas. Labels are the languages' own endonyms,
"English" and "Română", untranslated (`LANGUAGE_NAMES` in `src/i18n/index.ts`) — names, not
copy, so each can be found by someone who can't read the other. The halves are 34 tall, so a
vertical `hitSlop` of 5 makes them the 44 target without moving the pill's edge.

The halves are `radio`s in a `radiogroup`, `checked` on the current language; each carries
`accessibilityLanguage` so VoiceOver reads "Română" in a Romanian voice. A press switches
i18next and every mounted screen redraws in place — tab bar included — then the choice is
stored (`setLanguage`, AsyncStorage key `rospot.language`). With no choice stored the app
speaks the device's first language it knows, English otherwise. At launch the root layout
holds the splash screen until `restoreLanguage` has read the choice back, so a phone set to
one language never shows a frame of it to someone who chose the other.

#### 4.9 Edit your place — `src/app/edit/[id].tsx`

The Add tab's form and pin step (§4.5), prefilled with a place the author already sent in and
reached from a card on §4.8. One form, so a place is edited in the words it was written in:
`PlaceEditor` is the shared component, and what differs is the header, the pill and what
happens after the save.

- Header title `edit.title`, subtitle `edit.subtitle` — "Saving sends it back for review",
  the same posture as `add.subtitle`: the queue is stated up front, not after the fact.
- The form step carries a back chevron (§4.5's, labelled `edit.back`) because this screen is
  a route somebody arrived at, not a tab they are standing on.
- The pin step's pill reads `edit.save`, "Save and send for review" — the action keeps one
  name, and what the author gets back is a card reading PENDING.
- An address nobody touched skips the geocoder and keeps the pin as the author left it.
  Geocoding it again would move a place that only had its description fixed.
- Photos already in the bucket arrive as tiles like any other and are removed the same way;
  what is kept travels back as a path rather than as bytes.
- Loading, failed and not-found are screen states (§3), the last of them plain rather than an
  error: a stale card, a deleted place and somebody else's id are all "not yours to edit".

#### 4.10 Report a problem — `src/app/report/[id].tsx`

Pushed from the detail screen's pill (§4.4). A route rather than a sheet over the detail
screen: an anonymous reporter is sent to sign in and has to come back to something.

- The page header of §4.5 (`FormHeader`, from `src/components/Form.tsx` — the form parts the
  Add, edit and report screens share), title `report.title`, subtitle `report.subtitle`:
  "Only the moderator sees it", said up front as the Add tab says who reviews a place. A
  back chevron labelled `report.back`.
- **Reading the session / anonymous** — as §4.5: `Loading`, then the invitation column at
  the 40 measure with a primary pill to `/sign-in`, pushed so that signing in returns here.
- **Form** — one field, the §4.5 text input made `multiline`, `minHeight: 96`, under the
  form-label mark `report.note` with the `· optional` suffix; `maxLength` 1000, the table's
  ceiling. Then the primary pill `report.send`, `disabled` with an `ActivityIndicator` while
  sending. A report is **one tap**: the note never stands between anyone and the pill.
  A failed send puts `report.sendFailed` in cherry above the pill and keeps the note.
- **Sent** — the §4.5 done column without the band (a report is not a dancer joining):
  `report.done.title`, the muted hint that nothing on the map changes until the moderator
  has looked, and an outlined pill `report.back`. The header loses its chevron here — one
  way back is enough.

### Specified, not built

This one is mocked in the canvas and has no code. Build it from here; the numbers are
the canvas's, ported content-box → border-box as §2 warns.

#### 4.11 Onboarding

A centred column at a 34 measure. The **bird pair** at the top — `mirror(BIRD)` then `BIRD`,
126 × 96 each, `gap: 6` — then a 200px-wide 12px star band at `mt-5`. Title
`text-[27px] leading-[34px] font-bold tracking-[-0.4px]` centred and balanced, subtitle
`text-[14px] leading-[21px] text-muted` centred at `mt-2.5`. A primary pill ("Get started")
at `mt-8`, `px-8 py-[13px]`, label 15px. Below it a plain `text-[13px] font-medium
text-muted` "Skip for now" — browsing needs no account, and this screen must say so.

---

## 5. Divergences from the canvas

Deliberate, and not to be "fixed" back:

- **Category chips are on the List as well as the Map.** The canvas puts them only on the
  Map. Filtering is load-bearing on the List, and one selection is shared by both tabs, so
  switching tabs keeps whatever you filtered to.
- **There is no "All" chip.** The canvas draws one. The filter model treats no selection as
  everything, so an "All" chip would be a second way to say the same thing and a state to
  keep in sync.
- **No photo thumbnail row on the detail screen.** The canvas has a 52px strip under the
  hero. The gallery pages, and page marks already say how many photos there are.
- **The detail screen keeps its contact rows.** The canvas doesn't draw them; phone, website
  and social are v1 spec fields and the screen would be lying without them.
- **The map has no callout.** The canvas draws none; the first build used the platform's
  callout as the tap that meant "open this". Pins carry no title or description
  now: a tap selects, the card at the foot says which place it is in the language's own
  type, and the card opens it. A native bubble would have said the same thing a second
  time, in the OS's design. TalkBack reads the pins as bare markers; the List is the
  accessible way to browse every result.
- **The map's bottom card is `surface`, not white.** Every other card is white. This one
  sits on map tiles, where the app's own paper is what lifts it off them.
- **Photo page marks are centred.** They were aligned to a gutter the full-bleed hero
  deleted; centring is the only alignment a full-bleed gallery has.
- **The Add form has a second step the canvas doesn't draw.** The canvas's form ends in
  "Submit for review" under a hint that promises a map. The map is the pin step, so the
  form's pill is "Continue to the map" and "Submit for review" closes the pin — an action
  keeps one name, and it belongs to the button that performs it.
- **The Add form has three optional fields the canvas doesn't.** Phone, website and social
  page are v1 spec fields; they fold under one "Add contact details · optional" toggle after
  the photos, so the form the canvas draws is still the form a first-time submitter sees.
  #33.
- **The Add form says which step it is on.** The canvas's form is one step and needs no
  counter; with the pin as a second step, a muted eyebrow under the header says "Step 1 of
  2" and "Step 2 of 2". #33.
- **The Add form has no hatched tile.** The canvas fills an empty or loading photo tile with
  a 45° hatch. There are no empty tiles — the row is what was chosen, then the add tile —
  and the one loading state is the add tile's own spinner.
- **The Add tab has an anonymous state and a done state**, neither mocked. Both reuse
  columns the app already has (§4.8's invitation, §4.3's hora).
- **Sign-in ships without the provider buttons and their divider.** Apple and Google are the
  canvas's top half. They need a development build to work at all (#6), and a divider
  reading "or with email" over nothing else would be a rule with one side. Both go in
  together, above the email fields, exactly as the canvas draws them.
- **Sign-in has no "Forgot password?".** The canvas puts one under the password field. A
  reset is an email the project cannot yet deliver to a stranger's inbox; the link goes in
  with the SMTP that makes it work, in `voronet`, right-aligned under the pair.
- **Sign-in's field labels are accessible names, not drawn labels.** The canvas sets both
  fields with placeholders only, which leaves a screen reader saying "text field". The
  labels exist as `accessibilityLabel`s — sentence-case, unlike the drawn form-label mark of
  §4.5, because a screen reader spells all caps out letter by letter. The design is
  unchanged and the screen is navigable.
- **Sign-in has a back chip; the canvas has none.** Browsing needs no account, so a screen
  nobody is obliged to finish must have a way out that isn't the OS back gesture. It is a
  plain `chevron-back` on the app's paper rather than the detail screen's floating circle —
  that circle exists to survive a photograph behind it.
- **Place detail has a compact header the canvas doesn't draw.** The canvas only shows the
  detail screen with a photograph. A place with none — or with none that load — gets the
  compact header of §4.4 instead of a 4:3 empty box, and the back chip sits in its flow
  rather than floating: the floating circle exists to survive a photograph behind it.
- **The bird is 96 × 72, not the canvas's 96 × 73.** The grid is 16 × 12, so the height
  follows the width at the motif's own 4:3. A bird stretched to a box is a bird with a
  broken wing.
- **"Your places" carries a hint line the canvas doesn't draw.** The canvas has the label and
  the cards. An edit takes an approved place off the map until it is looked at again, which
  is a surprise worth spending one muted line to prevent.
- **The third status reads "Not accepted", not "Rejected".** The column is `rejected` and the
  badge is cherry, so nothing is being hidden; the word a person reads about their own
  submission is the one that leaves the door open, because editing it resubmits it.
- **There is a screen the canvas has no mock for at all: §4.9, editing a place.** It is the
  Add form again rather than a new surface, so the divergence is the route, not the design.
- **Profile has an anonymous state, which the canvas doesn't mock.** The canvas draws a
  signed-in Profile only. Most of this app's users have no account and are welcome not to,
  so the tab has to say something to them that isn't a wall.
- **Profile's identity line is the email alone.** The canvas has a name over an email.
  There is no name to show — nothing collects one — and inventing one from the address would
  put a stranger's name on their own screen. The initials in the rhomb come off the address
  for the same reason. It becomes name-over-email the day a profile carries a name.
- **A List card carries a photograph, a line of description, and Directions / Call.** The
  canvas's card is a bullet, an eyebrow, a name, an address and a distance. Photos and a
  description are required of every place and the List showed neither; and most visits to a
  list of places end in going there or ringing them, which took two taps. The thumbnail
  took the bullet's place. Owner's call, 2026-09-20.
- **The List's band and chips pin under the status bar.** The canvas is a still frame and
  has no opinion. The first divergence in this list says filtering is load-bearing on the
  List; a control that scrolls out of reach isn't bearing anything.
- **The detail screen has Directions and Call pills under the address, and Report is text.**
  The canvas's detail screen has neither action. They are the List card's two actions at
  the size of a screen, where they are what most visits end in; Report stepped down from a
  pill so that it doesn't compete with them. Owner's call, #28.
- **The List has a result row under its chips, and both tabs have Clear filters.** The
  canvas draws neither. Once the chips can empty a screen, the way back has to be one tap,
  and the List is where a count means something — the Map's pins are their own count, so
  its header stays as drawn. Clear is text, not the canvas's "All" chip (the second
  divergence above still stands). #31.
- **The Map has a Closest places control and a location control.** The canvas's map has no
  controls. Browsing starts from "what's near me", and once a user has panned away there
  was no way back short of leaving the tab. Both are surface pills rather than the
  platform's round buttons (`showsMyLocationButton` stays off): the OS's button would be the
  one control on the screen in someone else's design, and it knows nothing of the Detroit
  fallback. #30.
- **A List card with no photograph shows an outline rhomb in a bordered tile,** not the
  canvas's 45° hatch. The hatch is the canvas's mark for a photograph not yet chosen or not
  yet loaded; this tile means there isn't one, and an outline says "nothing here" where a
  hatch says "wait".

---

## 6. Changing this document

A UI change that contradicts §1–§4 changes them in the same commit, with the reason. A
change that diverges from the canvas adds a line to §5. Nothing in the app should be the
only record of a design decision.
