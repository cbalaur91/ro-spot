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
    // The line names the band stitched above it, so the hora reads as an
    // invitation rather than as decoration.
    emptyHint: 'Approved places show up here — the hora needs dancers.',
    emptyCta: 'Add the first place',
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
  auth: {
    // One screen in two modes, so the two sets of words sit side by side rather
    // than in two places that have to be kept saying the same thing.
    signIn: {
      title: 'Welcome back',
      subtitle: 'Sign in to add places to the map.',
      submit: 'Sign in',
      footer: 'New here?',
      footerAction: 'Create an account',
    },
    signUp: {
      title: 'Join the map',
      subtitle: 'An account is for adding places. Browsing never needs one.',
      submit: 'Create account',
      footer: 'Already have an account?',
      footerAction: 'Sign in',
    },
    // These two are read out, never drawn — the fields carry placeholders. All
    // caps here would have a screen reader spelling "E-M-A-I-L".
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'At least 6 characters',
    showPassword: 'Show',
    hidePassword: 'Hide',
    // Nothing lands in an inbox while the project confirms addresses itself,
    // but that is one switch in the dashboard and the screen has to be able to
    // say this the day it flips.
    confirmationSent: 'Check your inbox to confirm your address, then sign in.',
    errors: {
      missingFields: 'Enter your email and your password.',
      invalidCredentials: 'That email and password don’t go together.',
      emailTaken: 'That address already has an account. Sign in instead.',
      emailInvalid: 'That doesn’t look like an email address.',
      weakPassword: 'That password is too short — use at least 6 characters.',
      emailNotConfirmed: 'Confirm your address first — the link is in your inbox.',
      rateLimited: 'Too many tries. Give it a few minutes.',
      offline: 'No answer from the network. Check your connection and try again.',
      unknown: 'Something went wrong. Try again.',
    },
  },
  profile: {
    title: 'Profile',
    loading: 'Loading your account',
    // The whole posture of the app, said plainly: an account buys you
    // contributing, and nothing else is behind it.
    anonymousTitle: 'Browsing needs no account.',
    anonymousHint:
      'Sign in to add places to the map and to keep track of the ones you submitted.',
    signIn: 'Sign in',
    signOut: 'Sign out',
    signOutFailed: 'Could not sign you out. Try again.',
  },
  comingSoon: {
    add: 'Submitting a place arrives with sign-in.',
  },
} as const;
