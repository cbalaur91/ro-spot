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
  filters: {
    label: 'Filter by category',
    // One string for one situation, shared by both tabs — the Map and the List
    // are filtered by the same chips and should say the same thing about it.
    noMatch: 'No places match these filters.',
  },
  map: {
    empty: 'No places on the map yet.',
    error: 'Places could not be loaded.',
    retry: 'Try again',
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
    retry: 'Try again',
  },
  comingSoon: {
    add: 'Submitting a place arrives with sign-in.',
    profile: 'Your places and language settings live here.',
  },
} as const;
