// Hermes, the engine the app runs on, has no `Intl.PluralRules`. Without it
// i18next falls back — silently — to a rule that knows only "one" and "other",
// which is English's and not Romanian's: the device said "2 de locuri" where
// Node, and so every other test, says "2 locuri".
describe('plurals on an engine without Intl.PluralRules', () => {
  // Writable here, as it is in every engine; the lib types say read-only.
  const intl = Intl as { PluralRules?: typeof Intl.PluralRules };
  const native = intl.PluralRules;

  afterEach(() => {
    intl.PluralRules = native;
  });

  it.each([
    ['list.count', 1, '1 loc'],
    ['list.count', 2, '2 locuri'],
    ['list.count', 0, '0 locuri'],
    ['list.count', 20, '20 de locuri'],
    ['add.contact.added', 1, '1 câmp completat'],
    ['add.contact.added', 2, '2 câmpuri completate'],
  ] as const)('still says %s = %i in Romanian as “%s”', async (key, count, label) => {
    // Standing in for Hermes.
    delete intl.PluralRules;

    // A fresh i18next and a fresh polyfill, both loaded into the engine above.
    let i18n!: typeof import('@/i18n').default;
    jest.isolateModules(() => {
      i18n = jest.requireActual<typeof import('@/i18n')>('@/i18n').default;
    });
    await i18n.changeLanguage('ro');

    expect(i18n.t(key, { count })).toBe(label);
  });
});
