# BankStats mobile

Expo application for BankStats, using expo-router, Clerk for authentication, and Convex as the backend.

This app requires an Expo development build (`expo run:ios` / `expo run:android`). Expo Go is not a supported runtime — native modules used here (Clerk, secure storage) are not available in it.

## Setup

1. Install dependencies

   ```bash
   bun install
   ```

2. Copy the env template and fill in your keys

   ```bash
   cp .env.example .env.local
   ```

   - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` from the Clerk dashboard.
   - `EXPO_PUBLIC_CONVEX_URL` from your Convex deployment (`bunx convex dev` prints it on first run).

3. Log in to Convex and generate the client on first run

   ```bash
   bunx convex dev
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

- `src/app` — expo-router routes, kept thin.
- `src/features/*` — feature-based UI, hooks, and state, colocated per feature.
- `src/convex-client.ts` — shared Convex React client.
- `convex/` — Convex backend functions and schema.
