/**
 * RoSpot's palette, in one place because React Navigation options take plain
 * values rather than NativeWind classes. Keep this in sync with
 * `tailwind.config.js`.
 *
 * The two accents are named after real Romanian pigments: `voronet` is the blue
 * of the painted monasteries in Bucovina, `cherry` the vișiniu of embroidery
 * thread. Categories borrow from them so a colour always means the same thing.
 */
export const colors = {
  surface: '#FBFAF7',
  ink: '#171310',
  muted: '#6B6259',
  line: '#E4DED4',
  cherry: '#8C1D2C',
  voronet: '#2A5DA8',
  pine: '#3F5D4A',

  // The «Ie» tokens. `parchment` is the soft fill behind pills and chips, `gold`
  // the thread that lights the centre of a stitched star and `goldDark` the only
  // shade of it that carries text. The badge fills are tints of the status they
  // stand for; the map tints are the land under the pins and the deeper stripe
  // that hatches a photo that hasn't loaded.
  parchment: '#F2EEE6',
  gold: '#D9A03D',
  goldDark: '#B07C1F',
  badgePending: '#F7EFDD',
  badgeApproved: '#E8EEE9',
  mapLand: '#ECE7DC',
  mapShade: '#E9E4DA',
} as const;

export const categoryColor = {
  historic: colors.voronet,
  food_drink: colors.cherry,
  services: colors.pine,
} as const;
