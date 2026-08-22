import { View } from 'react-native';

import { colors } from '@/theme';

/**
 * The width of the column, and so the left inset everything else lines up to.
 * Mirrors the `w-9` / `px-9` the screens use, and is the number to import when
 * a layout has to agree with the gutter arithmetically rather than visually.
 */
export const GUTTER = 36;

/**
 * One segment of the column running down the left gutter — a hairline with a
 * rhomboid threaded on it, after Brâncuși's Coloana Infinitului.
 *
 * It is the app's one structural motif, so it lives in one place: a list row is
 * a segment, and the detail screen is the same segment repeated once per thing
 * there is to know about the place. A tinted rhomboid states a category; a
 * hollow one is just a notch, surface-filled so the hairline stops at its edges
 * instead of running through it.
 *
 * `offset` is the caller's, because where the rhomboid has to sit to land on the
 * first line of text depends on the padding the caller put above it.
 */
export function ColumnSegment({ tint, offset }: { tint?: string; offset: number }) {
  return (
    <View className="items-center" style={{ width: GUTTER }}>
      <View className="absolute bottom-0 top-0 w-px bg-line" />
      <View
        className="h-2.5 w-2.5 rotate-45"
        style={[
          { marginTop: offset },
          tint
            ? { backgroundColor: tint }
            : { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
        ]}
      />
    </View>
  );
}
