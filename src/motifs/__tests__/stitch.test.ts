import { BIRD, HORA, STAR, motifColors } from '@/motifs/grids';
import { CELL, mirror, repeat, stitch, tiling } from '@/motifs/stitch';

/** The two crossed strokes of one cell, as four absolute move/line commands. */
const commands = (d: string) =>
  [...d.matchAll(/([ML])(-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({
    cmd: m[1],
    x: Number(m[2]),
    y: Number(m[3]),
  }));

const RED = '#8C1D2C';
const BLUE = '#2A5DA8';

describe('stitch', () => {
  it('sizes the canvas by the grid, not by what is drawn in it', () => {
    const { width, height } = stitch(['..r.', '....', '....'], { r: RED });

    expect(width).toBe(4 * CELL);
    expect(height).toBe(3 * CELL);
  });

  it('scales the canvas and the thread with the cell', () => {
    const big = stitch(['r'], { r: RED }, 24);

    expect(big.width).toBe(24);
    expect(big.height).toBe(24);
    expect(big.strokeWidth).toBeCloseTo(24 * 0.28);
  });

  it('crosses two strokes over each cell, inset from its edges', () => {
    const [path] = stitch(['r'], { r: RED }).paths;
    const inset = CELL * 0.18;

    expect(commands(path.d)).toEqual([
      { cmd: 'M', x: inset, y: inset },
      { cmd: 'L', x: CELL - inset, y: CELL - inset },
      { cmd: 'M', x: CELL - inset, y: inset },
      { cmd: 'L', x: inset, y: CELL - inset },
    ]);
  });

  it('places a cell by its row and column', () => {
    const [path] = stitch(['..', '.r'], { r: RED }).paths;

    expect(commands(path.d)[0]).toEqual({
      cmd: 'M',
      x: CELL + CELL * 0.18,
      y: CELL + CELL * 0.18,
    });
  });

  it('merges every cell of one colour into a single path', () => {
    const { paths } = stitch(['rrr', 'rrr'], { r: RED });

    expect(paths).toHaveLength(1);
    expect(commands(paths[0].d)).toHaveLength(6 * 4);
  });

  it('gives each colour its own path, in the order the grid first uses it', () => {
    const { paths } = stitch(['.b', 'rb'], { r: RED, b: BLUE });

    expect(paths.map((p) => p.color)).toEqual([BLUE, RED]);
    expect(commands(paths[0].d)).toHaveLength(2 * 4);
    expect(commands(paths[1].d)).toHaveLength(1 * 4);
  });

  it('leaves characters the colour map does not name unstitched', () => {
    expect(stitch(['.-x '], { r: RED }).paths).toEqual([]);
  });
});

describe('repeat', () => {
  it('lays the tile out across a wider grid of the same height', () => {
    const tiled = repeat(STAR, 4);

    expect(tiled).toHaveLength(STAR.length);
    expect(tiled[0]).toHaveLength(STAR[0].length * 4);
  });

  it('keeps a band down to one path per colour however wide it runs', () => {
    const tile = stitch(STAR, motifColors);
    const band = stitch(repeat(STAR, 30), motifColors);

    expect(band.paths.map((p) => p.color)).toEqual(tile.paths.map((p) => p.color));
    expect(band.width).toBe(tile.width * 30);
    expect(band.height).toBe(tile.height);
  });
});

describe('tiling', () => {
  // Phone widths, a tablet, and a band narrower than one tile.
  const BANDS = [320, 360, 375, 390, 412, 428, 1024, 132, 12.5];
  const STAR_TILE = 14 * (11 / 9);
  const HORA_TILE = 58 * (24 / 13);

  it('tiles nothing until the band has been measured', () => {
    expect(tiling(0, STAR_TILE, 'start')).toEqual({ offset: 0, count: 0 });
  });

  it.each(BANDS)('starts a %spt band flush with its left edge', (band) => {
    expect(tiling(band, STAR_TILE, 'start').offset).toBe(0);
  });

  it.each(BANDS)('begins a %spt centred band just off its left edge', (band) => {
    const { offset } = tiling(band, HORA_TILE, 'center');

    expect(offset).toBeLessThanOrEqual(0);
    expect(offset).toBeGreaterThan(-HORA_TILE);
  });

  it.each(BANDS)('puts a whole tile over the middle of a %spt band', (band) => {
    const { offset } = tiling(band, HORA_TILE, 'center');
    // How far the nearest tile's midpoint sits from the band's own midpoint.
    const drift = Math.abs((band / 2 - (offset + HORA_TILE / 2)) % HORA_TILE);

    expect(Math.min(drift, HORA_TILE - drift)).toBeCloseTo(0);
  });

  describe.each([
    ['a left-aligned star band', STAR_TILE, 'start' as const],
    ['a centred hora band', HORA_TILE, 'center' as const],
  ])('%s', (_name, tile, align) => {
    it.each(BANDS)('runs past the end of a %spt band', (band) => {
      const { offset, count } = tiling(band, tile, align);

      expect(offset + count * tile).toBeGreaterThanOrEqual(band);
    });

    it.each(BANDS)('keeps a whole spare tile beyond a %spt band', (band) => {
      const { offset, count } = tiling(band, tile, align);

      expect(offset + (count - 1) * tile).toBeGreaterThanOrEqual(band);
    });

    it.each(BANDS)('spares no more than one tile on a %spt band', (band) => {
      const { offset, count } = tiling(band, tile, align);

      expect(offset + (count - 2) * tile).toBeLessThan(band);
    });
  });
});

describe('mirror', () => {
  it('reverses every row', () => {
    expect(mirror(['ab.', '.cd'])).toEqual(['.ba', 'dc.']);
  });

  it('is its own inverse', () => {
    expect(mirror(mirror(BIRD))).toEqual(BIRD);
  });

  it('stitches the same thread onto the same canvas', () => {
    const straight = stitch(BIRD, motifColors);
    const flipped = stitch(mirror(BIRD), motifColors);

    expect(flipped.width).toBe(straight.width);
    expect(flipped.height).toBe(straight.height);
    expect(flipped.paths.map((p) => p.color).sort()).toEqual(
      straight.paths.map((p) => p.color).sort()
    );
  });

  it('reflects each cell across the vertical centre line', () => {
    const grid = ['r...'];
    const [straight] = stitch(grid, { r: RED }).paths;
    const [flipped] = stitch(mirror(grid), { r: RED }).paths;

    expect(commands(straight.d)[0].x).toBeCloseTo(CELL * 0.18);
    expect(commands(flipped.d)[0].x).toBeCloseTo(CELL * 3.18);
  });
});

describe('the ported grids', () => {
  it.each([
    { name: 'STAR', grid: STAR, width: 11, height: 9 },
    { name: 'HORA', grid: HORA, width: 24, height: 13 },
    { name: 'BIRD', grid: BIRD, width: 16, height: 12 },
  ])('carries $name over at $width×$height', ({ grid, width, height }) => {
    expect(grid).toHaveLength(height);
    expect(grid.every((row) => row.length === width)).toBe(true);
  });

  it('stitches every glyph the grids use', () => {
    const glyphs = new Set([...STAR, ...HORA, ...BIRD].flatMap((row) => [...row]));
    glyphs.delete('.');

    expect([...glyphs].filter((g) => !motifColors[g])).toEqual([]);
  });
});
