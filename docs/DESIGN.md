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
| `mapLand` | `map-land` | `#ECE7DC` | The land the map is drawn on — used directly by the web map stand-in. |
| `mapShade` | `map-shade` | `#E9E4DA` | The deeper stripe of the 45° hatch that stands in for a photo not yet chosen or not yet loaded. |

The eight tokens from `card` down are the «Ie» additions. `goldDark`, `badgePending`,
`badgeApproved` and `mapShade` are reserved for screens in §4 that have not shipped yet;
they are in the palette so those screens land on-design rather than inventing a hex.

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
| `HORA` | 24 × 13 (a man and a woman, hand in hand) | The empty state, as a band. Nowhere else — the hora means "there is nobody here yet". |
| `BIRD` | 16 × 12 | Onboarding and Sign-in only (§4.7, §4.8). A whole-screen welcome motif, not an accent. |

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
| Star, header signature | `14` | from layout | Under the List and Map headers, and the Add and Profile ones of §4.9–§4.10. Runs past the gutter — a signature that stopped at the gutter would read as a rule. |
| Star, divider | `10` | from layout | The strip over a map card; the divider between a place's address and its description. |
| Star, short | `10` | `132` | ComingSoon; the canvas's Sign-in. A fixed width because the parent is a centred column and gives its children none. |
| Star, welcome | `12` | `200` | Onboarding, under the bird pair. The one band that is neither 10 nor 14. |
| Hora | `58` | from layout | The List's true-empty invitation, and only there. |

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
| `10` | `cherry` | ComingSoon's accent. |
| `10` | `line` | The detail screen's not-found notice. |
| `11` | `cherry` | The Map header's accent; the web map stand-in. |
| `17` (13px core) | category | The map pin — 2px `surface` ring, shadow `0px 1px 3px rgba(0,0,0,0.3)`. |

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
— worn by place rows, the map's bottom card, and the Profile "your places" rows of §4.10.
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

The Profile card of §4.10 varies less: `rounded-xl` (12) and `px-[14px] py-3`.

### Eyebrow

Uppercase, semibold, `tracking-[1.5px]`, in the category tint.

- `10px` on a card (`text-[10px]`)
- `11px` on the detail screen, `leading-4` — the same eyebrow at the scale of a screen
  rather than a row
- `muted` instead of a tint when the eyebrow labels a field rather than a category (the
  contact rows)

Form field labels are a different mark: `11px` semibold, `tracking-[0.8px]`, `ink`. Use them
only above an input or a group (§4.9, §4.10).

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
| `18` | The List's card margin — cards are wider than the text above them. |
| `22` | The detail body. Prose set to a card's measure reads as a card that lost its border. |
| `14` / `12` | The map card: 14 from the left and right edges, 12 from the foot. |
| `40` | The empty invitation. Centred text at the app gutter reads as a paragraph that lost its page. |
| `36` | ComingSoon. |

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

#### 4.5 ComingSoon — `src/components/ComingSoon.tsx`

The placeholder for a tab a later slice fills in, at the 36 measure: a 10px cherry rhomb, a
132px-wide 10px star band, centred by the column, at `my-5`, then `comingSoon.<tab>` in `text-[15px] leading-6
text-muted`. It says what will be here rather than pretending to be a screen — but in the
app's own language, so an unbuilt tab reads as unfinished rather than as somewhere else.
Add and Profile both use it today. Replacing one means replacing it with §4.9 or §4.10.

#### 4.6 Tab bar — `src/app/(tabs)/_layout.tsx`

`surface` ground, `line` top border, cherry active and muted inactive, labels at 11px with
`0.2px` tracking, Ionicons outline icons. Four tabs in order: Map, List, Add, Profile.
Headers are off — every screen draws its own.

### Specified, not built

These four are mocked in the canvas and have no code. Build them from here; the numbers are
the canvas's, ported content-box → border-box as §2 warns.

#### 4.7 Onboarding

A centred column at a 34 measure. The **bird pair** at the top — `mirror(BIRD)` then `BIRD`,
126 × 96 each, `gap: 6` — then a 200px-wide 12px star band at `mt-5`. Title
`text-[27px] leading-[34px] font-bold tracking-[-0.4px]` centred and balanced, subtitle
`text-[14px] leading-[21px] text-muted` centred at `mt-2.5`. A primary pill ("Get started")
at `mt-8`, `px-8 py-[13px]`, label 15px. Below it a plain `text-[13px] font-medium
text-muted` "Skip for now" — browsing needs no account, and this screen must say so.

#### 4.8 Sign-in

A centred column at a 28 measure. One 96 × 73 `BIRD`, title `text-[26px] leading-[31px]`
at `mt-[18px]`, subtitle at `mt-[7px]`, then a 132px-wide 10px star band at `my-5`.

Provider buttons are **full-round outlined pills on white**, `py-3`, icon 16 and label
`text-[14px] font-semibold text-ink`, `gap-[9px]`, stacked `gap-2.5`: Apple takes a
`1.5px ink` border, Google a `1.5px line` one. Then a rule–label–rule divider ("or with
email", `text-[11.5px] text-muted`, hairlines in `line`, `gap-3`).

Email and password inputs are the **10px-radius white input**, not a pill:
`border border-line rounded-[10px] px-[13px] py-3 bg-card`, value `text-[13.5px]`,
placeholder in muted. Password carries a `text-[12px] font-medium` "Show" in `voronet` at
its right; "Forgot password?" sits right-aligned under the pair in the same colour. A
primary pill ("Sign in") at `mt-3.5`, `py-[13px]`, label 15px. Footer: `text-[12.5px]
text-muted` with "Create an account" in `text-[12.5px] font-semibold text-cherry`.

#### 4.9 Add form

Page header at the 24 gutter — `text-[24px] font-bold tracking-[-0.4px]` title, `text-[12.5px]
text-muted` subtitle ("Reviewed before it goes public" — the moderation queue is stated up
front, not after submitting) — then the **14px star band edge to edge**, then the form at
the 24 gutter with `gap-3.5` between fields.

Five fields, in this order: **NAME, CATEGORY, ADDRESS, DESCRIPTION, PHOTOS** — name first
because it is the one thing the submitter certainly knows, photos last because choosing them
leaves the app.

Each field is a label over a control, `gap-1.5`. Labels are the form label mark (11px
semibold, `tracking-[0.8px]`, ink); the PHOTOS label carries its rule as a normal-weight
muted suffix ("· 1–5 required"). Controls:

- **Text input** — `border border-line rounded-[10px] px-[13px] py-[11px] bg-card`, value
  `text-[13.5px] text-ink`.
- **Description** — the same input, ~56px tall, `leading-[20px]`.
- **Category** — a chip row, exactly the §3 chip. Single-select here (a place has one
  category), unlike the multi-select filter chips.
- **Address** — the input plus a `text-[11.5px] text-muted` hint under it ("You'll confirm
  the pin on a map next").
- **Photos** — 52px `rounded-lg` tiles in a `gap-2` row. A chosen photo is the image; the
  add tile is a `1.5px dashed line` border with a 20px muted `+`. An empty or loading tile
  is the 45° hatch, 6px `mapShade` / 6px `parchment`.

A primary pill ("Submit for review") closes the form, `py-3`, label 14px.

#### 4.10 Profile

Page header (`text-[24px] font-bold`, no subtitle), the 14px star band edge to edge, then
the body at the 24 gutter with `gap-[18px]`.

- **Identity** — a 44px **cherry rhomb avatar with an 8px corner radius**, initials inside
  counter-rotated so they read upright, `text-[15px] font-semibold text-surface`; `gap-[13px]`
  to the name (`text-[16px] font-semibold`) over the email (`text-[12.5px] text-muted`).
- **Your places** — the form label ("YOUR PLACES"), then §3 cards at `gap-2`, `rounded-xl`,
  `px-[14px] py-3`, name `text-[14px] font-semibold` over locality `text-[11.5px] text-muted`,
  and a **status badge** opposite: `rounded-full px-2.5 py-1`, `text-[10.5px] font-semibold`,
  PENDING in `goldDark` on `badgePending`, APPROVED in `pine` on `badgeApproved`. The card's
  3px top border stays the **category** tint, not the status — status is the badge's job.
- **Language** — the form label ("LANGUAGE"), then a segmented pill: `border border-line rounded-full p-[3px] bg-card`, two
  halves at `py-2`, the selected one filled cherry and full-round with a
  `text-[13px] font-semibold text-surface` label, the other `text-[13px] font-medium
  text-muted`. Labels are the language's own endonyms, "English" and "Română", untranslated.
- **Account** — pushed to the bottom (`mt-auto`), `gap-3`: "Sign out" as
  `text-[13.5px] font-semibold text-cherry`, "Delete account" as plain `text-[12.5px]
  text-muted`. Deletion is a store requirement, not a feature — it is present, and it is
  quiet.

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
- **ComingSoon has no counterpart in the canvas.** The canvas mocks the finished Add and
  Profile screens; the app needs something to show until those ship, and §4.5 is it.

---

## 6. Changing this document

A UI change that contradicts §1–§4 changes them in the same commit, with the reason. A
change that diverges from the canvas adds a line to §5. Nothing in the app should be the
only record of a design decision.
