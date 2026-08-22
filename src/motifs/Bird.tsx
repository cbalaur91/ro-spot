import { useMemo } from 'react';

import { BIRD, motifColors } from '@/motifs/grids';
import { Motif } from '@/motifs/Motif';
import { mirror, stitch } from '@/motifs/stitch';

/**
 * The pasăre — the welcome motif, and the only one that stands alone rather
 * than running in a band.
 *
 * The caller gives a width and the bird keeps the grid's own 4:3, because a
 * bird stretched to a box is a bird with a broken wing. Onboarding pairs a
 * mirrored one with a plain one facing each other; the sign-in screen takes a
 * single bird.
 */
export function Bird({ width, facing = 'right' }: { width: number; facing?: 'left' | 'right' }) {
  const motif = useMemo(
    () => stitch(facing === 'left' ? mirror(BIRD) : BIRD, motifColors),
    [facing]
  );

  return <Motif motif={motif} width={width} height={width * (BIRD.length / BIRD[0].length)} />;
}
