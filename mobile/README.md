# BankStats mobile

Expo application for BankStats, using expo-router, Clerk for authentication, and Convex as the backend.

This app requires an Expo development build (`expo run:ios` / `expo run:android`). Expo Go is not a supported runtime — the native modules used here are not available in it, and the app throws on startup when it detects Expo Go.

## Setup

1. Install dependencies from the repository root

   ```bash
   bun install
   ```

2. Copy the env template and fill in your keys

   ```bash
   cp .env.example .env.local
   ```

   - `EXPO_PUBLIC_APP_ENV` — the delivery lane this checkout builds, normally `development`.
   - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` from the Clerk dashboard. Outside the production lane this must be a `pk_test_…` key.
   - `EXPO_PUBLIC_CONVEX_URL` from your Convex deployment (`bun run dev` in `services/convex` prints it on first run).

3. Log in to Convex and generate the client on first run

   ```bash
   cd ../services/convex && bunx convex dev
   ```

4. Build and install a development build on a simulator/device, and start Convex, in one step, from the repository root

   ```bash
   ./run.sh ios
   ./run.sh android
   ```

## Day-to-day development

From the repository root:

```bash
./run.sh ios
./run.sh android
```

Each command starts Convex and runs the native build/launch for that platform. See `../scripts/run-ios.sh` and `../scripts/run-android.sh`.

## Structure

- `app.config.ts` — Expo configuration; derives the app identity from the active delivery lane.
- `src/app` — expo-router routes, kept thin.
- `src/features/*` — feature-based UI, hooks, and state, colocated per feature.
- `src/app-environment.ts` — resolves and validates the lane and its credentials at startup.
- `src/convex-client.ts` — shared Convex React client.
- `plugins/` — local Expo config plugins, see [plugins/README.md](plugins/README.md).

Convex functions live outside this package, in `../services/convex`.
