export default {
  tabs: {
    map: 'Hartă',
    list: 'Listă',
    add: 'Adaugă',
    profile: 'Profil',
  },
  categories: {
    historic: 'Istoric',
    food_drink: 'Mâncare și băutură',
    services: 'Servicii',
  },
  units: {
    // Milele rămân mile: toate locurile sunt în Statele Unite. Separatorul
    // zecimal îl pune formatorul `number` al lui i18next, după limbă.
    miles: '{{value, number}} mi',
    milesBelow: '< {{value, number}} mi',
  },
  actions: {
    retry: 'Încearcă din nou',
    back: 'Înapoi',
  },
  filters: {
    label: 'Filtrează după categorie',
    noMatch: 'Niciun loc nu se potrivește cu filtrele.',
  },
  map: {
    empty: 'Niciun loc pe hartă deocamdată.',
    error: 'Locurile nu au putut fi încărcate.',
    webUnsupported: 'Harta are nevoie de aplicația de iOS sau Android.',
    webUnsupportedHint: 'Aceleași locuri sunt în fila Listă.',
  },
  list: {
    subtitle: 'Locuri românești din Statele Unite',
    fallbackOrigin: 'Distanțele sunt măsurate din centrul orașului Detroit. Activează localizarea ca să le măsori de unde ești.',
    loading: 'Se încarcă locurile',
    empty: 'Niciun loc deocamdată.',
    emptyHint: 'Locurile aprobate apar aici.',
    error: 'Locurile nu au putut fi încărcate.',
  },
  detail: {
    photo: 'Fotografia {{index}} din {{total}}',
    noPhotos: 'Încă nu există fotografii ale acestui loc.',
    call: 'Sună',
    website: 'Site web',
    social: 'Rețele sociale',
    linkFailed: 'Acest dispozitiv nu are cu ce să deschidă linkul.',
    loading: 'Se încarcă locul',
    error: 'Locul nu a putut fi încărcat.',
    notFound: 'Locul acesta nu este aici.',
    notFoundHint: 'Poate a fost șters sau poate încă așteaptă aprobarea.',
  },
  comingSoon: {
    add: 'Adăugarea unui loc vine odată cu autentificarea.',
    profile: 'Aici vor fi locurile tale și setările de limbă.',
  },
} as const;
