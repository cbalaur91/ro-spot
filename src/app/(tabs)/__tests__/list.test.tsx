import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { SEEDED_APPROVED_PLACE } from '@/data/fixtures';
import i18n from '@/i18n';

import ListScreen from '../list';

jest.mock('@/data/places', () => ({
  fetchApprovedPlaces: jest.fn(),
}));

const { fetchApprovedPlaces } = jest.requireMock('@/data/places') as {
  fetchApprovedPlaces: jest.Mock;
};

const seededPlace = { ...SEEDED_APPROVED_PLACE, created_at: '2026-08-21T00:00:00Z' };

// `render` is async in @testing-library/react-native 14.
async function renderScreen(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

beforeEach(async () => {
  jest.clearAllMocks();
  await i18n.changeLanguage('en');
});

describe('List tab', () => {
  it('renders an approved place from the data module', async () => {
    fetchApprovedPlaces.mockResolvedValue([seededPlace]);

    await renderScreen(<ListScreen />);

    expect(await screen.findByText(seededPlace.name)).toBeTruthy();
    expect(screen.getByText(seededPlace.address)).toBeTruthy();
    expect(screen.getByText('Historic')).toBeTruthy();
  });

  it('translates chrome and category labels into Romanian', async () => {
    fetchApprovedPlaces.mockResolvedValue([seededPlace]);
    await i18n.changeLanguage('ro');

    await renderScreen(<ListScreen />);

    expect(await screen.findByText('Istoric')).toBeTruthy();
    expect(screen.getByText('Locuri românești din Statele Unite')).toBeTruthy();
    // User content is shown as written, never translated.
    expect(screen.getByText(seededPlace.name)).toBeTruthy();
  });

  it('invites a first submission when there is nothing to show', async () => {
    fetchApprovedPlaces.mockResolvedValue([]);

    await renderScreen(<ListScreen />);

    expect(await screen.findByText('No places yet.')).toBeTruthy();
    expect(screen.getByText('Approved places show up here.')).toBeTruthy();
  });

  it('offers a retry when loading fails', async () => {
    fetchApprovedPlaces.mockRejectedValue(new Error('offline'));

    await renderScreen(<ListScreen />);

    expect(await screen.findByText('Something went wrong loading places.')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Try again')).toBeTruthy());
  });
});
