import { View } from 'react-native';

/**
 * The rhomb — the smallest unit of the language, and the one that isn't
 * stitched. It is a plain rotated square rather than SVG because at the sizes
 * it is used (a bullet, a chip dot, a map pin) a stitched X would be mud, and
 * because a view can carry a border and a shadow that an SVG path can't.
 *
 * The border and the shadow are the map pin's: a pale ring and a little lift
 * are what keep a rhomb legible over map tiles it shares its colours with.
 * Everywhere else the rhomb sits on the app's own ground and needs neither, and
 * the lift is the caller's value to give — what a rhomb has to rise off is not
 * something the rhomb knows.
 */
export function Diamond({
  size,
  tint,
  border,
  borderWidth = 1,
  shadow,
}: {
  size: number;
  tint: string;
  border?: string;
  borderWidth?: number;
  shadow?: string;
}) {
  return (
    <View
      className="rotate-45"
      style={{
        width: size,
        height: size,
        backgroundColor: tint,
        ...(border ? { borderColor: border, borderWidth } : null),
        // The CSS shorthand rather than the per-platform shadow props: it is one
        // value on both platforms, and it follows the rotation as the border does.
        ...(shadow ? { boxShadow: shadow } : null),
      }}
    />
  );
}
