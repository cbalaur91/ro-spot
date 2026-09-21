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
no animation beyond the photo gallery's fade.

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
| `cherry` | `cherry` | `#8C1D2C` | The primary accent — the vișiniu of embroidery thread. Wordmark's "Ro", filled pills, selected chips, active tab, links that are actions. Also the **Food & Drink** tint. |
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

A tint arrives as data, so anything carrying it — a card's top border, a bullet, an eyebrow,
a pin, a chip label — takes it as an inline style value, not as a class.

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
| `BIRD` | 16 × 12 | Sign-in and Onboarding only (§4.7, §4.10). A whole-screen welcome motif, not an accent. |

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
mud, and a view can carry a border and a shadow that a path can't. The border and shadow are
the map pin's alone — everywhere else the rhomb sits on the app's own ground and needs
neither.

| Size | Tint | Where |
|---|---|---|
| `6` | `surface` | The dot inside a selected chip. |
| `9` | category | The bullet on a place card, 5px down so it reads against the eyebrow rather than above it. |
| `10` | `line` | The detail screen's not-found notice. |
| `11` | `cherry` | The Map header's accent; the web map stand-in. |
| `17` (13px core) | category | The map pin — 2px `surface` ring, shadow `0px 1px 3px rgba(0,0,0,0.3)`. Bare, the web stand-in for the Add pin. |
| `25` | category | The Add pin (§4.5) — 3px `surface` ring, the map pin's shadow. A size up because it is dragged, not just seen. |
| `44` | `cherry` | Profile's identity mark — `radius` 8, holding counter-rotated initials. The one rhomb big enough to carry content. |

`radius` softens the corners; children are laid over the rhomb's centre **rotated with it**,
so anything that must read upright counter-rotates itself. The rotation belongs to the
shape, and undoing it belongs to the content.

**Sizes come from the canvas as content-box.** CSS there has no border-box reset; React
Native is border-box. A canvas rhomb stated as 13px with a 2px border is 17px of view. Add
the border twice when porting a size.

Photo-gallery page marks are 6px rhombs that are *not* `Diamond` — the inactive one is a
1px `line` outline with no fill, which `Diamond` does not express. If a second outline-only
rhomb ever appears, that is the moment to give `Diamond` the variant.

---

## 3. Component recipes

Numbers below are what shipped. Where a class expresses it, the class is given.

### Card

One shape — white ground, hairline border, soft radius, a 3px band of colour along the top
— worn by place rows, the map's bottom card, and the Profile "your places" rows of §4.8.
The numbers below are the place row's; the variants say where they differ.

- `bg-card` (white), `border border-line`, `rounded-[13px]`
- `borderTopWidth: 3` in the category tint (inline — the tint is data)
- padding `px-4 py-3.5` (16 / 14)
- Contents: a 9px tint bullet at `mt-[5px]`, `gap-[11px]` to the text column; distance
  opposite, `self-start`
- Pressed: `active:opacity-80` on the whole card. A card can't take a full-bleed press
  highlight without losing its edges, so it dims instead.
- On the List: `mx-[18px] mb-3`

The map's card varies deliberately: `rounded-xl` (12), `bg-surface` rather than white
(it sits on map tiles, and the app's own paper is what lifts it off them), a 10px star band
across the top instead of a tint border, `overflow-hidden`, body `px-[14px] pb-[14px] pt-[11px]`,
`active:opacity-90` rather than 80 — it dims against map tiles, not against paper — and a
shadow of `0px 4px 14px {ink}1F`, the palette's own colour at 12% rather than a second black.

The Profile card of §4.8 varies less: `rounded-xl` (12) and `px-[14px] py-3`.

### Eyebrow

Uppercase, semibold, `tracking-[1.5px]`, in the category tint.

- `10px` on a card (`text-[10px]`)
- `11px` on the detail screen, `leading-4` — the same eyebrow at the scale of a screen
  rather than a row
- `muted` instead of a tint when the eyebrow labels a field rather than a category (the
  contact rows)

Form field labels are a different mark: `11px` semibold, `tracking-[0.8px]`, `ink`. Use them
only above an input or a group (§4.5, §4.8).

### Pills

| Pill | Recipe |
|---|---|
| Primary (filled) | `rounded-full bg-cherry`, label `text-[14px] font-semibold text-surface`, `px-6 py-3`, `active:opacity-80`. The one thing to do on a screen that failed. |
| Secondary (outlined) | `rounded-full border-[1.5px] border-cherry`, label `text-[14px] font-semibold text-cherry`, `px-6 py-[11px]`, `active:opacity-70`. An invitation rather than the app insisting. |
| Distance | `rounded-full bg-parchment px-[9px] py-1`, label `text-[11px] font-semibold text-muted` with `fontVariant: ['tabular-nums']`. |

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
- A contact row is `accessibilityRole="link"` labelled `"{label}: {value}"`.
- A photo is labelled `Photo {index} of {total}` — a gallery a screen reader can't count is
  a photo that might be the only one.
- The map card is one button labelled with the **place's name**, not "open place": the card
  is the place. A List row is a button with no explicit label — its accessible name is the
  card's own text, which already reads category, name, address and distance. Label a card
  explicitly only where the text inside it wouldn't do.
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

Pins are rhombs, no stem: category tint, 2px `surface` ring, `0px 1px 3px rgba(0,0,0,0.3)`,
anchored `{x: 0.5, y: 1}` so the rhomb's lower vertex marks the coordinate. Black in the
shadow rather than `ink` — a pin has to lift off map tiles whose colours aren't ours to
match. `tracksViewChanges` stays on: switching it off is the usual fix for hundreds of
markers, but on Android it can leave a custom pin blank on first paint, and the launch
dataset is 10–20 places. Tapping the **callout** navigates, not the pin.

The foot of the map holds exactly one card, and three things can stand in it:

1. **Error** — the notice and a bare cherry `actions.retry`.
2. **Nearest place** — the first of the distance-sorted visible list (chips included: a
   filtered map's nearest place is the nearest place the user asked to see). Eyebrow, name
   `text-[16px] leading-5`, address, bare distance. The whole card is one button to that
   place's detail.
3. **Empty** — `filters.noMatch` when chips are on, `map.empty` when they aren't. Blaming
   the chips for an empty dataset would send the user hunting for a filter to undo.

While the query is pending, no card shows.

The screen measures whatever stands in the foot and hands `PlacesMap` the covered height as
`footInset`, which the map takes as bottom `mapPadding`. That keeps the Google logo — which
the Maps terms require to stay visible — above the card, and centres the map on the part of
it the user can see. Don't position the card without going through that wrapper.

Web has no map: `src/components/PlacesMap.tsx` says so on `bg-map-land` under an 11px cherry
rhomb, and points at the List tab. Web is a dev convenience, not a release target.

#### 4.2 List — `src/app/(tabs)/list.tsx`

30px wordmark and `list.subtitle` at the 24 gutter, the fallback-origin note under them when
— and only when — the origin has resolved to the fallback. Then the 14px star band edge to
edge, then the chip row. Rows are cards at `mx-[18px] mb-3`; the whole card navigates.
Pull-to-refresh is the list's refetch.

#### 4.3 List, empty — `EmptyInvitation` in the same file

**Only the true empty gets the hora.** A list emptied by the user's own chips gets
`filters.noMatch` in a `ScreenNotice` instead; offering to add a place there would answer a
question nobody asked.

Centred in what's left below the header, at the 40 measure: a stretched 58px hora band,
`mt-[26px]` to `list.empty` (`text-[17px] font-semibold`), `mt-[7px]` to `list.emptyHint`
(`text-[13px] leading-[19.5px] text-muted`, centred), `mt-6` to an outlined pill reading
`list.emptyCta`, which pushes to `/add`.

The band is stretched rather than dropped straight in — it measures itself, and a centred
column gives its children no width to measure. The list's `contentContainerStyle` carries
`flexGrow: 1` so the invitation has a full screen to centre in.

#### 4.4 Place detail — `src/app/place/[id].tsx`

Full-bleed photo hero, hard against the top of the screen: the photographs lead, and the
chrome that would frame them floats over them. The back chip is a 32px `surface` circle,
`0px 1px 4px {ink}26`, `chevron-back` 20 in ink, held clear of the status bar by a top-edge
`SafeAreaView` (not `useSafeAreaInsets`, which needs a provider this pushed screen shouldn't
depend on), with 6px of padding around it for the 44 target. It renders **last**, so it
paints over the photographs.

Body at the 22 measure: 11px eyebrow, name `text-[23px] leading-[29px] font-semibold`,
address line, a 10px star band divider at `my-4`, then the description as written by
whoever submitted it. Contact rows follow — label over value, icon at the right, separated
by a **top** hairline so the first row's rule doubles as the line under the description.

The distance appears **only once the origin has resolved** — while the permission prompt is
still up there is nothing to measure from but a guess about the reader. It is a nested
`Text` inside the address line rather than a longer string: one node the address, one the
measurement. No fallback-origin caveat here; the List says it once over a whole column of
numbers, and this screen has one.

Photos: one per page at the full width of the screen, snapped by `snapToInterval`, faded in
over a `line` box. Page marks are centred 6px rhombs — ink for the page you're on, a `line`
outline otherwise — and only appear past one photo. No photos at all gets a bordered box at
4:3 with a small outlined rhomb and `detail.noPhotos`.

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
edge under it.

**Reading the session / anonymous** — as Profile (§4.8): `Loading` first, so the gate never
flashes at someone already signed in, then the invitation at the 40 measure with a primary
pill to `/sign-in`. This is the one place the app asks for an account.

**Form** — a `ScrollView` at the 24 gutter, `gap: 14`, `paddingVertical: 18`,
`keyboardShouldPersistTaps="handled"`. Fields in order: **NAME, CATEGORY, ADDRESS,
DESCRIPTION, PHONE, WEBSITE, SOCIAL PAGE, PHOTOS** — name first because it is the one thing
the submitter certainly knows, photos last because choosing them leaves the app, and the
three optional fields between the prose and the photos so they never stand between someone
and the required ones.

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
container has `flexGrow: 1`: identity at the top, "your places" between, and the account
block at the foot of a short screen or below the cards on a long one. Identity is the 44px **cherry rhomb with an 8px corner radius**, initials
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
`/sign-in`. It states the bargain rather than blocking on it.

**Your places**, `mt-6`, `flex-1` so it takes the room between identity and account: the form
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

Two blocks of the canvas's Profile are **not built yet** and arrive with the slices that
give them something to show. They slot in between "your places" and the account block:

- **Language** (#13) — the form label ("LANGUAGE"), then a segmented pill: `border
  border-line rounded-full p-[3px] bg-card`, two halves at `py-2`, the selected one filled
  cherry and full-round with a `text-[13px] font-semibold text-surface` label, the other
  `text-[13px] font-medium text-muted`. Labels are the language's own endonyms, "English"
  and "Română", untranslated.
- **Delete account** (#10) — plain `text-[12.5px] text-muted` under "Sign out", `gap-3`.
  Deletion is a store requirement, not a feature — it is present, and it is quiet.

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

### Specified, not built

This one is mocked in the canvas and has no code. Build it from here; the numbers are
the canvas's, ported content-box → border-box as §2 warns.

#### 4.10 Onboarding

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
- **No "Report a problem" button.** In the canvas and in the v1 spec, but there is no
  reporting backend yet. It goes in when the feature does — outlined pill, `1.5px line`
  border, cherry label, at the foot of the detail body.
- **The detail screen keeps its contact rows.** The canvas doesn't draw them; phone, website
  and social are v1 spec fields and the screen would be lying without them.
- **The map's bottom card is `surface`, not white.** Every other card is white. This one
  sits on map tiles, where the app's own paper is what lifts it off them.
- **Photo page marks are centred.** They were aligned to a gutter the full-bleed hero
  deleted; centring is the only alignment a full-bleed gallery has.
- **The Add form has a second step the canvas doesn't draw.** The canvas's form ends in
  "Submit for review" under a hint that promises a map. The map is the pin step, so the
  form's pill is "Continue to the map" and "Submit for review" closes the pin — an action
  keeps one name, and it belongs to the button that performs it.
- **The Add form has three optional fields the canvas doesn't.** Phone, website and social
  page are v1 spec fields; they sit between the description and the photos.
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

---

## 6. Changing this document

A UI change that contradicts §1–§4 changes them in the same commit, with the reason. A
change that diverges from the canvas adds a line to §5. Nothing in the app should be the
only record of a design decision.
