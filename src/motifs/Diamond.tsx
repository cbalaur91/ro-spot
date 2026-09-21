import { View } from 'react-native';

/**
 * The rhomb — the smallest unit of the language, and the one that isn't
 * stitched. It is a plain rotated square rather than SVG because at the sizes
 * it is used (a chip dot, a map pin, a mark in a tile) a stitched X would be
 * mud, and because a view can carry a border and a shadow that an SVG path can't.
 *
 * The ring around a filled rhomb and the shadow are the map pin's: a pale ring
 * and a little lift are what keep a rhomb legible over map tiles it shares its
 * colours with. Everywhere else the rhomb sits on the app's own ground and needs
 * neither, and the lift is the caller's value to give — what a rhomb has to rise
 * off is not something the rhomb knows. The other thing a border can be is the
 * whole rhomb: a `transparent` tint and a `border` is an outline.
 *
 * `radius` softens the corners — a rhomb large enough to hold something is a
 * lozenge rather than a point. Children are laid over its centre **rotated with
 * it**, so anything that has to read upright counter-rotates itself: the
 * rotation is the shape's, and undoing it is the content's business.
 */
export function Diamond({
  size,
  tint,
  border,
  borderWidth = 1,
  radius,
  shadow,
  children,
}: {
  size: number;
  tint: string;
  border?: string;
  borderWidth?: number;
  radius?: number;
  shadow?: string;
  children?: React.ReactNode;
}) {
  return (
    <View
      className="rotate-45 items-center justify-center"
      style={{
        width: size,
        height: size,
        backgroundColor: tint,
        ...(radius ? { borderRadius: radius } : null),
        ...(border ? { borderColor: border, borderWidth } : null),
        // The CSS shorthand rather than the per-platform shadow props: it is one
        // value on both platforms, and it follows the rotation as the border does.
        ...(shadow ? { boxShadow: shadow } : null),
      }}
    >
      {children}
    </View>
  );
}
