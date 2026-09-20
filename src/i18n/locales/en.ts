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
  add: {
    title: 'Add a place',
    // The moderation queue is stated up front, not after submitting.
    subtitle: 'Reviewed before it goes public',
    loading: 'Loading your account',
    anonymousTitle: 'Adding a place needs an account.',
    anonymousHint: 'Sign in to put a Romanian place on the map. Browsing never needs one.',
    signIn: 'Sign in',
    // Sentence-case: these are read out as the inputs' names as well as drawn,
    // and the form-label mark uppercases them where it draws them.
    fields: {
      name: 'Name',
      category: 'Category',
      address: 'Address',
      description: 'Description',
      phone: 'Phone',
      website: 'Website',
      socialUrl: 'Social page',
      photos: 'Photos',
    },
    optional: 'optional',
    optionalLabel: '{{field}} (optional)',
    photosRule: '1–5 required',
    placeholders: {
      name: 'What people call it',
      address: 'Street, city, state',
      description: 'What is it, and what makes it Romanian?',
      phone: '(313) 555-0100',
      website: 'example.com',
      socialUrl: 'facebook.com/…',
    },
    addressHint: 'You’ll confirm the pin on a map next',
    addPhotos: 'Add photos',
    removePhoto: 'Remove photo {{index}}',
    continue: 'Continue to the map',
    problems: {
      nameRequired: 'Give the place a name.',
      categoryRequired: 'Choose a category.',
      addressRequired: 'Add the address.',
      descriptionRequired: 'Say a few words about the place.',
      phoneUnusable: 'That doesn’t look like a phone number.',
      websiteUnusable: 'That doesn’t look like a web address.',
      socialUnusable: 'That doesn’t look like a web address.',
      photosRequired: 'Add at least one photo.',
      photosTooMany: 'Five photos at most.',
    },
    pin: {
      title: 'Confirm the pin',
      edit: 'Edit details',
      hint: 'Hold the pin and drag it, or tap the map, to mark the entrance.',
      notFound: 'That address didn’t come up on the map. Move the pin to the right spot.',
      webUnsupported: 'Moving the pin needs the iOS or Android app.',
      // The formatter is i18next's, as for miles: the separator follows the locale.
      coords: '{{lat, number(maximumFractionDigits: 5)}} · {{lng, number(maximumFractionDigits: 5)}}',
      submit: 'Submit for review',
    },
    submitFailed: 'The place wasn’t sent. Check your connection and try again.',
    done: {
      title: 'Sent for review.',
      // Answers the empty List's line — "the hora needs dancers".
      hint: 'It joins the map once it’s approved — the hora has one more dancer.',
      again: 'Add another place',
    },
  },
} as const;
