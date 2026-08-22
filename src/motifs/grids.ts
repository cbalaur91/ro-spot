/**
 * The pixel grids, carried over character-for-character from the design canvas
 * (`assets/RoSpot Motifs.dc.html`). They are data, not drawings: change one here
 * and the design and the app disagree.
 */
import type { ColorMap, Grid } from '@/motifs/stitch';
import { colors } from '@/theme';

/**
 * The thread alphabet the grids are written in. One map for all of them, since
 * a letter means the same colour in every motif.
 */
export const motifColors: ColorMap = {
  r: colors.cherry,
  b: colors.ink,
  y: colors.gold,
  v: colors.voronet,
};

/** The pasăre, 16×12 — the welcome motif. */
export const BIRD: Grid = [
  '......rr........',
  '.....rrrr...b...',
  '..yyrrbrr..bb...',
  '....rrrrr.bb....',
  '..rrrrrrrrr.b...',
  '.rrrbbbbrrrrbb..',
  'rrrbbbbbbrrrbbb.',
  '.rrbbbbbbbrrrbb.',
  '..rrbbbbbbrr.b..',
  '...rrrrrrrr.....',
  '.....rr..rr.....',
  '....rr....rr....',
];

/** One tile of the star band, 11×9. Bands repeat it along the x axis. */
export const STAR: Grid = [
  'v...r...v..',
  '...rrr.....',
  '.r.ryr.r...',
  '..ryyyr....',
  'rryy.yyrr..',
  '..ryyyr....',
  '.r.ryr.r...',
  '...rrr.....',
  'v...r...v..',
];

const MAN: Grid = [
  'b..........b',
  '.b........b.',
  '..b..bb..b..',
  '...b.bb.b...',
  '....bbbb....',
  '....byyb....',
  '...bbyybb...',
  '....bbbb....',
  '....b..b....',
  '....b..b....',
  '....b..b....',
  '...bb..bb...',
  '............',
];

const WOMAN: Grid = [
  'b..........b',
  '.b........b.',
  '..b..bb..b..',
  '...b.bb.b...',
  '....bbbb....',
  '....bvvb....',
  '...bbvvbb...',
  '..bbbbbbbb..',
  '.bbbbbbbbbb.',
  '.bbbbbbbbbb.',
  '....b..b....',
  '...bb..bb...',
  '............',
];

/** A dancer of each, hand in hand — 24×13, and the tile the hora band repeats. */
export const HORA: Grid = MAN.map((row, i) => row + WOMAN[i]);
