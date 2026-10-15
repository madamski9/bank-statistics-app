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

Each command starts Convex and runs the native build/launch for that platform. See `../scripts/run-mobile.sh` (and `../scripts/setup-mobile.sh`, which it runs automatically when dependencies are missing).

Two more platforms are available: `./run.sh web` (browser) and `./run.sh start` (bundler only, once a dev build is already installed).

## Structure

- `app.config.ts` — Expo configuration; derives the app identity from the active delivery lane.
- `src/app` — expo-router routes, kept thin.
- `src/features/*` — feature-based UI, hooks, and state, grouped by product area; see [src/features/README.md](src/features/README.md) for the map.
- `src/app-environment.ts` — resolves and validates the lane and its credentials at startup.
- `src/convex-client.ts` — shared Convex React client.
- `plugins/` — local Expo config plugins, see [plugins/README.md](plugins/README.md).

Convex functions live outside this package, in `../services/convex`.

## Home Screen widgets

BankStats provides four small and medium widgets: **Wydatki**, **Najbliżej limitu**, **Limity**, and **Sklepy**. Add them at the same size, then drag them onto one another to create an iOS widget stack. Swipe up or down through the stack. Disable Smart Rotate in the stack settings if you want the selected view to stay in place. The existing Wydatki widget also keeps its configurable view.

Open the app once after installing the new native build and signing in. Captured transactions then recalculate all four widgets directly from the encrypted local outbox, including shop rankings and saved limits, without launching the React Native screen. Edits and deletions also refresh the widgets. WidgetKit controls when the requested refresh becomes visible. Signing out disables background financial snapshots and clears the displayed amounts. Background captures preserve the widget blur setting and the original five-minute reveal deadline across all four views.

The `withSpendingWidget` prebuild plugin bundles the existing TypeScript snapshot calculator into a JavaScriptCore resource for the ingestion module. Changes to that calculator or its dependencies require `bunx expo prebuild --platform ios` and a new native build. An OTA update alone cannot update the background calculator. The generated resource under `packages/ingestion-native/ios/Resources` is ignored by Git.

On a device, verify capture with the app closed, capture while the phone is locked, a repeated notification, an edited/deleted transaction, and a capture after signing out. All four views should reflect the same totals as the app; a signed-out widget should contain no financial data.
