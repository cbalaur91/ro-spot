---
status: accepted
---

# Adopt the Direction B «Ie» design language, drawn procedurally

The app's first screens used a placeholder visual language — a hairline "column" rail with
rhomboid notches — while the product's identity was still open. A design exploration
produced three directions; **Direction B, «Ie»** (Romanian cross-stitch: festive star bands,
stitched cards, diamond accents, hora dancers) was chosen and mocked across all eight
screens in `assets/RoSpot Motifs.dc.html`. Every existing surface is now restyled to it, the
rail components the restyle orphaned are deleted, and `docs/DESIGN.md` is the binding
reference for all future UI/UX work. The motifs themselves are **generated at runtime** from
the canvas's own pixel grids and stitch algorithm (`src/motifs/`) rather than exported from
it as images.

## Considered Options

**Bundled raster motifs** — export each motif from the canvas as a PNG and ship it in
`assets/`. The obvious path, and rejected: a star band is tiled at whatever width a screen
happens to be and at three heights, and the rhomb is drawn at half a dozen sizes. Raster
assets would mean an export per size per density, all of them stale the moment the canvas
changes, and a redrawing rather than the design.

**Procedural SVG from the canvas's grids** — chosen. The grids are copied
character-for-character, so the app's motifs *are* the mock's motifs and the canvas stays
the source of truth; the geometry is pure and testable without rendering; and a motif is
crisp at any size because it scales by its viewBox.

## Consequences

- **`react-native-svg` is a dependency** — the only one this restyle added, and nothing else
  in the tree was already pulling it in. It is Expo-managed (`npx expo install` resolves the
  version for the SDK), but it is a native module: it needs a rebuild rather than a reload,
  and anything that renders a motif under Jest depends on `jest-expo` transforming it (a
  view stand-in mock is the fallback if that ever stops holding).
- **A band must be told its width or be given one by layout.** SVG has no `repeat-x`, so
  `Band` measures itself and lays whole tiles. A band in a row or a centred column measures
  zero and draws nothing — see `docs/DESIGN.md` §2.
- **Grids are edited in the canvas, not in `grids.ts`.** Editing the code copy makes the
  design and the app disagree, with no test to catch it.
