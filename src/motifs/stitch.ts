/**
 * The cross-stitch geometry behind every «Ie» motif, ported from the design
 * canvas (`assets/RoSpot Motifs.dc.html`) so the app's motifs are the mock's
 * motifs rather than a redrawing of them.
 *
 * A motif is a pixel grid: one string per row, one character per cell, and a
 * colour map saying which thread each character is stitched in. Every stitched
 * cell is two strokes crossed over a square inset from the cell's edges — the X
 * of a real cross-stitch — and all the cells of one colour are merged into a
 * single path, because a motif is a handful of paths rather than hundreds of
 * elements no matter how large the grid.
 *
 * This module is deliberately free of React: it returns numbers and path data,
 * and `Motif.tsx` is the only thing that knows they end up in an SVG.
 */

/** One string per row, one character per cell. */
export type Grid = readonly string[];

/** Which thread each grid character is stitched in. Unnamed characters are gaps. */
export type ColorMap = Readonly<Record<string, string>>;

export type StitchedPath = {
  readonly color: string;
  /** SVG path data in the grid's own coordinates. */
  readonly d: string;
};

export type Stitched = {
  /** The grid's size in its own coordinates — the viewBox a renderer scales from. */
  readonly width: number;
  readonly height: number;
  readonly strokeWidth: number;
  readonly paths: readonly StitchedPath[];
};

/**
 * The side of one cell. Motifs are scaled by their viewBox rather than by this,
 * so it only sets the precision the path data is written at.
 */
export const CELL = 12;

/** How far each stitch is held back from its cell's edges, and how thick it is. */
const INSET_RATIO = 0.18;
const STROKE_RATIO = 0.28;

export function stitch(rows: Grid, map: ColorMap, cell = CELL): Stitched {
  const inset = cell * INSET_RATIO;
  const byColor = new Map<string, string[]>();

  rows.forEach((row, y) => {
    [...row].forEach((character, x) => {
      const color = map[character];
      if (!color) return;

      const x0 = x * cell + inset;
      const y0 = y * cell + inset;
      const x1 = (x + 1) * cell - inset;
      const y1 = (y + 1) * cell - inset;

      const stitches = byColor.get(color) ?? [];
      stitches.push(`M${x0} ${y0}L${x1} ${y1}M${x1} ${y0}L${x0} ${y1}`);
      byColor.set(color, stitches);
    });
  });

  return {
    width: (rows[0]?.length ?? 0) * cell,
    height: rows.length * cell,
    strokeWidth: cell * STROKE_RATIO,
    paths: [...byColor].map(([color, stitches]) => ({ color, d: stitches.join('') })),
  };
}

/**
 * The same tile laid out `times` across. Bands need repetition, and React
 * Native SVG has no `repeat-x`; stitching one wide grid instead of translating
 * copies keeps a band down to one path per colour, exactly like a single motif.
 */
export function repeat(rows: Grid, times: number): Grid {
  return rows.map((row) => row.repeat(times));
}

export type Tiling = {
  /** How far left of the band's edge the run starts. Never positive. */
  readonly offset: number;
  /** How many tiles to lay down. Zero when there is no band to fill yet. */
  readonly count: number;
};

/**
 * How to lay a tile across a band: where the run starts and how many tiles it
 * takes. The run always overdraws by one tile so a band never ends mid-stitch,
 * which means the caller must clip.
 *
 * A centred run puts a whole tile over the band's midpoint and steps back by
 * whole tiles from there, so the motif reads as arranged around the centre
 * rather than as a strip that happens to start at the left edge.
 */
export function tiling(band: number, tile: number, align: 'start' | 'center'): Tiling {
  if (band <= 0) return { offset: 0, count: 0 };

  const middle = (band - tile) / 2;
  const offset = align === 'center' ? middle - Math.ceil(middle / tile) * tile : 0;

  return { offset, count: Math.ceil((band - offset) / tile) + 1 };
}

/** The same motif facing the other way, for the pairs the design uses. */
export function mirror(rows: Grid): Grid {
  return rows.map((row) => [...row].reverse().join(''));
}
