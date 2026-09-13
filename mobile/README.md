# BankStats mobile

Expo application for BankStats, using expo-router, Clerk for authentication, and Convex as the backend.

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

4. Build and install a development build on a simulator/device

   ```bash
   bunx expo run:ios
   bunx expo run:android
   ```

## Day-to-day development

After the native app is installed once via `expo run:ios`/`expo run:android`, start Metro and Convex together:

```bash
./run.sh
```

## Structure

- `src/app` — expo-router routes, kept thin.
- `src/features/*` — feature-based UI, hooks, and state, colocated per feature.
- `src/convex-client.ts` — shared Convex React client.
- `convex/` — Convex backend functions and schema.
