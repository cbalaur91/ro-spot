# RoSpot — v1 Specification

Approved 2026-08-21. This is the confirmed shared understanding from the scoping session; changes to it should be deliberate, not incidental.

## Product

RoSpot is a community map of Romanian places in the US (HuGo-style, hellohugo.app). Users browse a map of Romanian businesses, historic sites, and services; signed-in users submit new places, which are moderated before going public.

**Launch posture:** soft launch in Metro Detroit, seeded with 10–20 places by the owner, promoted through local Romanian channels (churches, Facebook groups). Expansion follows contributors, not marketing.

## v1 scope

### Browsing (no account required)
- Map view (`react-native-maps`, native providers: Apple Maps on iOS, Google Maps on Android) centered on user location when permitted.
- Distance-sorted list view of the same results.
- Category filter chips: **Historic / Food & Drink / Services**.
- No text search in v1 (add when dataset density demands it).
- Place detail screen: photos, name, category, address, description, optional phone / website / social link, "Report a problem" button.

### Contributing (sign-in required)
- Auth: Sign in with Apple (native), Google (native sign-in), email + password fallback. Supabase Auth.
- Submission form: name, category, description, address → on-device geocoding (`expo-location`, free) → draggable pin confirmation. Store both address string and lat/lng.
- Photos: required, 1–5, compressed client-side (~1600px longest edge, JPEG ~80%) before upload to Supabase Storage.
- Submissions land as `pending`; sole moderator (owner) approves via Supabase dashboard. No admin UI in v1.
- Authors can edit their own places; edits return the place to `pending`.
- Duplicate assist: flag submissions within ~150m of an existing place with a similar name (moderator-facing data only).
- "Report a problem": one tap + optional free text → `reports` row reviewed in dashboard.

### Explicitly deferred to v2+
- Events (as a first-class type with dates/expiry — NOT a category), comments, gamification/stars, favorites, push notifications, text search, suggest-edits by strangers, business-owner claiming, subcategories, product analytics, Facebook login.

### Compliance (required for store approval)
- In-app account deletion (Apple requirement; Supabase edge function).
- Privacy policy URL (hosted page).
- Anonymous browsing satisfies Apple 5.1.1; Sign in with Apple satisfies 4.8.

## Data model (places)

Required: `name`, `category` (`historic` | `food_drink` | `services`), `address`, `lat`, `lng`, `description`, `status` (`pending` | `approved` | `rejected`), photos (1–5), author.
Optional: `phone`, `website`, `social_url`.
Excluded from v1: opening hours, price range, ratings.

RLS: anonymous `select` on approved places; authenticated insert (as pending); authors update own rows (back to pending).

## Stack

- Expo (latest stable) + Expo Router, TypeScript strict, **bun**.
- `@tanstack/react-query` + `supabase-js` for server state; React context for the small remainder (no Redux/Zustand).
- NativeWind for styling, `expo-image` for photos.
- i18n from day one: `expo-localization` + `i18next`, **Romanian + English**, device-locale default with manual toggle. UGC displayed as written, no translation.
- Sentry (`@sentry/react-native`) for crash reporting. No product analytics in v1.
- Supabase project: `rospot`, ref `bnkwiqnatknsgkftouti`, region `us-east-2`, Postgres 17. Free tier (note: pauses after 7 days inactivity — revisit at launch week: Pro plan or keep-alive).

## Development posture

- Developing on WSL2 (no Xcode). Android-first: physical Android phone + dev builds (needed for native auth and Google Maps).
- iOS: built cross-platform but unverified until an Apple Developer account exists and an iPhone tester is available. Native-auth buttons feature-flagged off under Expo Go.
- No store accounts yet. Google Play note: new personal accounts need a 12-tester/14-day closed test before production.
- App identity: **RoSpot** (working name), bundle ID `com.cbalaur.rospot` (TBC before first build — painful to change later).
- Repo: `github.com/cbalaur91/ro-spot` (local dir `~/projects/ro-in-us`).
