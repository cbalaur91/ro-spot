import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import i18n from '@/i18n';

import TabsLayout from '../_layout';

// The real tab navigator over four empty screens: what is under test is the bar.
function renderTabs() {
  const empty = () => null;
  return renderRouter({
    '(tabs)/_layout': TabsLayout,
    '(tabs)/index': empty,
    '(tabs)/list': empty,
    '(tabs)/add': empty,
    '(tabs)/profile': empty,
  });
}

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('the tab bar', () => {
  it('names the tabs in Romanian', async () => {
    await i18n.changeLanguage('ro');

    await renderTabs();

    expect(await screen.findByText('Hartă')).toBeOnTheScreen();
    expect(screen.getByText('Listă')).toBeOnTheScreen();
    expect(screen.getByText('Profil')).toBeOnTheScreen();
  });

  it('tells VoiceOver where each tab sits in Romanian, not half in English', async () => {
    // Jest runs as iOS.
    await i18n.changeLanguage('ro');

    await renderTabs();

    expect(await screen.findByLabelText('Hartă, fila 1 din 4')).toBeOnTheScreen();
    expect(screen.getByLabelText('Profil, fila 4 din 4')).toBeOnTheScreen();
  });
});
