import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { HORA, STAR, motifColors } from '@/motifs/grids';
import { Motif } from '@/motifs/Motif';
import { type Grid, repeat, stitch, tiling } from '@/motifs/stitch';

/**
 * A motif tile run along the x axis — the app's header signature and its
 * dividers.
 *
 * A caller normally says only how tall the band is and lets it take its width
 * from the layout, which means it has to be given one: a band in a row or a
 * centred stack has no width of its own and will measure zero, so those callers
 * pass `width` instead. Until the first layout there is nothing to tile and the
 * band is an empty view of the right height, reserving its space without
 * drawing.
 *
 * The run overdraws by a whole tile and the band clips, so it never ends
 * mid-stitch and never leaves a seam at a fractional width. The tiles are
 * absolutely positioned so that a band whose parent sizes to its content
 * measures the layout rather than its own overflow.
 */
function Band({
  grid,
  height,
  width,
  align = 'start',
}: {
  grid: Grid;
  height: number;
  width?: number;
  align?: 'start' | 'center';
}) {
  const [measured, setMeasured] = useState(0);
  const band = width ?? measured;

  const tile = height * (grid[0].length / grid.length);
  const { offset, count } = tiling(band, tile, align);

  const tiled = useMemo(() => stitch(repeat(grid, count), motifColors), [grid, count]);

  return (
    <View
      style={{ width, height, overflow: 'hidden' }}
      onLayout={
        width === undefined
          ? (event) => setMeasured(event.nativeEvent.layout.width)
          : undefined
      }
    >
      {count > 0 ? (
        <Motif
          motif={tiled}
          width={count * tile}
          height={height}
          style={{ position: 'absolute', left: offset }}
        />
      ) : null}
    </View>
  );
}

/**
 * The star band. 14 is the header signature, 10 the shorter strip that divides
 * a card or a block of text.
 */
export function StarBand({ height = 14, width }: { height?: number; width?: number }) {
  return <Band grid={STAR} height={height} width={width} />;
}

/** The hora, danced across the width — what an empty list is missing. */
export function HoraBand({ height = 58 }: { height?: number }) {
  return <Band grid={HORA} height={height} align="center" />;
}
