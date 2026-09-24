import * as Sentry from '@sentry/react-native';

import { startCrashReporting } from '../crashReporting';

const init = Sentry.init as jest.Mock;

beforeEach(() => init.mockClear());

describe('startCrashReporting', () => {
  it('stays off without a DSN, so a clone with no Sentry project runs as before', () => {
    startCrashReporting(undefined);
    startCrashReporting('');

    expect(init).not.toHaveBeenCalled();
  });

  it('reports to the project the DSN names', () => {
    const dsn = 'https://key@o1.ingest.us.sentry.io/2';

    startCrashReporting(dsn);

    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith(expect.objectContaining({ dsn }));
  });

  it('sends no personal data the policy would have to disclose', () => {
    startCrashReporting('https://key@o1.ingest.us.sentry.io/2');

    expect(init).toHaveBeenCalledWith(expect.objectContaining({ sendDefaultPii: false }));
  });

  it('sends nothing on a launch that did not go wrong', () => {
    startCrashReporting('https://key@o1.ingest.us.sentry.io/2');

    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({ enableAutoSessionTracking: false })
    );
  });

  it('leaves out the requests the app made, whose URLs carry account ids', () => {
    startCrashReporting('https://key@o1.ingest.us.sentry.io/2');
    const [{ beforeBreadcrumb }] = init.mock.calls[0] as [
      { beforeBreadcrumb: (crumb: { category?: string }) => unknown },
    ];

    for (const category of ['fetch', 'xhr', 'http']) {
      expect(beforeBreadcrumb({ category })).toBeNull();
    }
    // What the person did on screen is how a crash is read, and names nobody.
    const tap = { category: 'touch' };
    expect(beforeBreadcrumb(tap)).toBe(tap);
  });
});
