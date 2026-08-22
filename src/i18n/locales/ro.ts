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
    // Invitația, nu traducerea ei: hora cusută deasupra chiar are nevoie de
    // dansatori, iar linia asta o spune pe românește.
    emptyHint: 'Locurile aprobate apar aici — hora are nevoie de dansatori.',
    emptyCta: 'Adaugă primul loc',
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
  auth: {
    signIn: {
      title: 'Bine ai revenit',
      subtitle: 'Autentifică-te ca să adaugi locuri pe hartă.',
      submit: 'Intră în cont',
      footer: 'Ești nou aici?',
      footerAction: 'Creează un cont',
    },
    signUp: {
      title: 'Intră în hartă',
      subtitle: 'Contul e pentru adăugat locuri. Ca să te uiți, nu ai nevoie de unul.',
      submit: 'Creează contul',
      footer: 'Ai deja un cont?',
      footerAction: 'Intră în cont',
    },
    emailLabel: 'E-mail',
    emailPlaceholder: 'tu@exemplu.com',
    passwordLabel: 'Parolă',
    passwordPlaceholder: 'Cel puțin 6 caractere',
    showPassword: 'Arată',
    hidePassword: 'Ascunde',
    confirmationSent: 'Confirmă adresa din e-mailul primit, apoi autentifică-te.',
    errors: {
      missingFields: 'Scrie adresa de e-mail și parola.',
      invalidCredentials: 'Adresa și parola nu se potrivesc.',
      emailTaken: 'Adresa aceasta are deja un cont. Autentifică-te.',
      emailInvalid: 'Adresa aceasta nu pare a fi un e-mail.',
      weakPassword: 'Parola e prea scurtă — folosește cel puțin 6 caractere.',
      emailNotConfirmed: 'Confirmă întâi adresa — linkul e în e-mailul primit.',
      rateLimited: 'Prea multe încercări. Mai încearcă peste câteva minute.',
      offline: 'Rețeaua nu răspunde. Verifică conexiunea și încearcă din nou.',
      unknown: 'Ceva nu a mers. Încearcă din nou.',
    },
  },
  profile: {
    title: 'Profil',
    loading: 'Se încarcă contul tău',
    anonymousTitle: 'Ca să te uiți, nu ai nevoie de cont.',
    anonymousHint: 'Autentifică-te ca să adaugi locuri pe hartă și să vezi ce ai trimis.',
    signIn: 'Intră în cont',
    signOut: 'Ieși din cont',
    signOutFailed: 'Nu am putut să te deconectez. Încearcă din nou.',
  },
  comingSoon: {
    add: 'Adăugarea unui loc vine odată cu autentificarea.',
  },
} as const;
