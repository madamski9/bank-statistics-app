# BankStats

BankStats is a privacy-first mobile cash-flow tracker that derives normalized transactions from supported bank notifications without connecting to bank accounts.

The canonical product and implementation specification is in [docs/PRODUCT-SPEC.md](docs/PRODUCT-SPEC.md).

## Workspace

A bun workspace with one boundary per concern:

| Package                       | Contents                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `mobile`                      | Expo application, organized by product feature ([ADR 0014](docs/adr/0014-organize-frontend-code-by-feature.md)) |
| `packages/app-config`         | Delivery lane resolution and runtime support checks                            |
| `packages/parser-rules`       | Shared versioned bank rules ([ADR 0005](docs/adr/0005-share-parser-rules-across-native-interpreters.md)) |
| `packages/ingestion-native`   | Swift and Kotlin ingestion modules ([ADR 0004](docs/adr/0004-use-expo-with-native-platform-modules.md)) |
| `services/convex`             | Convex functions, schema, and auth configuration                               |

## Delivery lanes

Every build belongs to exactly one lane, declared by `EXPO_PUBLIC_APP_ENV`:

| Lane          | Bundle identifier            | Scheme               | Clerk credentials |
| ------------- | ---------------------------- | -------------------- | ----------------- |
| `development` | `com.bankstats.app.dev`      | `bankstats-dev`      | `pk_test_…`       |
| `preview`     | `com.bankstats.app.preview`  | `bankstats-preview`  | `pk_test_…`       |
| `production`  | `com.bankstats.app`          | `bankstats`          | `pk_live_…`       |

Lanes install side by side and never share deep links. Nothing defaults to a lane: the Expo config
fails if `EXPO_PUBLIC_APP_ENV` is unset, and the application refuses to start when a lane is paired
with credentials belonging to another one — a preview build cannot silently run on production Clerk
keys, and a production build cannot ship pointing at a test instance.

## Development

Expo Go is not a supported runtime ([ADR 0004](docs/adr/0004-use-expo-with-native-platform-modules.md)); the app rejects it at startup. Use a development build.

After completing the mobile setup (see [mobile/README.md](mobile/README.md)), build, install, and run the app together with Convex:

```bash
./run.sh ios
./run.sh android
```

## Verification

```bash
bun run typecheck
bun test
bun run lint
```

The same checks run in GitHub Actions on every pull request.
