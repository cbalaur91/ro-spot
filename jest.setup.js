// Expo CLI injects EXPO_PUBLIC_* from .env at bundle time; Jest doesn't, so the
// integration tests would otherwise see an unconfigured Supabase client.
require('dotenv').config({ quiet: true });

// jest-expo installs Expo's "winter" runtime, whose `fetch` is an inert stub, and
// Node 20 has no global WebSocket for supabase-js's realtime client to find. The
// integration tests talk to a real Supabase project, so put working
// implementations back.
//
// node-fetch rather than undici: undici's gzip decompression never settles under
// Jest, which silently turns any response large enough for Supabase to compress
// into a test timeout.
const nodeFetch = require('node-fetch');
Object.assign(global, {
  fetch: nodeFetch,
  Headers: nodeFetch.Headers,
  Request: nodeFetch.Request,
  Response: nodeFetch.Response,
  WebSocket: require('ws'),
});

// supabase-js persists its session through AsyncStorage, which has no native
// module under Jest.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
