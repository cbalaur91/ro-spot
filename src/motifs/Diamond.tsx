import { View } from 'react-native';

/**
 * The rhomb — the smallest unit of the language, and the one that isn't
 * stitched. It is a plain rotated square rather than SVG because at the sizes
 * it is used (a bullet, a chip dot, a map pin) a stitched X would be mud, and
 * because a view can carry a border and a shadow that an SVG path can't.
 */
export function Diamond({
  size,
  tint,
  border,
}: {
  size: number;
  tint: string;
  border?: string;
}) {
  return (
    <View
      className="rotate-45"
      style={{
        width: size,
        height: size,
        backgroundColor: tint,
        ...(border ? { borderColor: border, borderWidth: 1 } : null),
      }}
    />
  );
}
