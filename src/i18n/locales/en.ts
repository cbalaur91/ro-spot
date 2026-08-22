export default {
  tabs: {
    map: 'Map',
    list: 'List',
    add: 'Add',
    profile: 'Profile',
  },
  categories: {
    historic: 'Historic',
    food_drink: 'Food & Drink',
    services: 'Services',
  },
  units: {
    // The dataset is entirely US, where the road signs are in miles. The
    // `number` formatter is i18next's, so the decimal separator follows the
    // locale rather than the source file.
    miles: '{{value, number}} mi',
    milesBelow: '< {{value, number}} mi',
  },
  actions: {
    // Shared by every screen that can fail or be backed out of — one string per
    // thing the user can do, not one per screen that offers it.
    retry: 'Try again',
    back: 'Back',
  },
  filters: {
    label: 'Filter by category',
    // One string for one situation, shared by both tabs — the Map and the List
    // are filtered by the same chips and should say the same thing about it.
    noMatch: 'No places match these filters.',
  },
  map: {
    empty: 'No places on the map yet.',
    error: 'Places could not be loaded.',
    webUnsupported: 'The map needs the iOS or Android app.',
    webUnsupportedHint: 'The same places are in the List tab.',
  },
  list: {
    subtitle: 'Romanian places across the US',
    fallbackOrigin: 'Distances are from downtown Detroit. Turn on location to measure from where you are.',
    loading: 'Loading places',
    empty: 'No places yet.',
    emptyHint: 'Approved places show up here.',
    error: 'Something went wrong loading places.',
  },
  detail: {
    // The count is in the label because a gallery a screen reader can't count is
    // a photo that might be the only one.
    photo: 'Photo {{index}} of {{total}}',
    noPhotos: 'No photos of this place yet.',
    call: 'Call',
    website: 'Website',
    social: 'Social',
    linkFailed: 'This device has nothing that can open that link.',
    loading: 'Loading place',
    error: 'Something went wrong loading this place.',
    notFound: 'That place is not here.',
    // Both halves of the truth: it may be gone, or it may not be public yet.
    notFoundHint: 'It may have been removed, or it may still be waiting for review.',
  },
  comingSoon: {
    add: 'Submitting a place arrives with sign-in.',
    profile: 'Your places and language settings live here.',
  },
} as const;
