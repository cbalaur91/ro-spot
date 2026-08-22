import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { Stitched } from '@/motifs/stitch';

/**
 * A stitched grid, drawn. The motif keeps its own coordinates in the viewBox
 * and the caller gives it a box, so a motif is resolution-independent: there
 * are no bundled images and nothing to re-export when a size changes.
 */
export function Motif({
  motif,
  width,
  height,
  style,
}: {
  motif: Stitched;
  width: number;
  height: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${motif.width} ${motif.height}`}
      style={style}
    >
      {motif.paths.map((path) => (
        <Path
          key={path.color}
          d={path.d}
          stroke={path.color}
          strokeWidth={motif.strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}
