# Features

Code is grouped by product area first, then by feature, then by the part of the
screen it draws. Start from the area that matches what you see in the app.

| Area | What lives there |
| --- | --- |
| `app-shell/` | Building blocks shared by every screen: brand and loading screen, theme tokens, amount and date formatting, motion primitives, sheet layout, the name prompt and localization (with the language picker). |
| `auth/` | Signing in: the sign-in screen, the e-mail code flow and the Clerk token cache. |
| `onboarding/` | The first-run flow, one file per step in `steps/`, plus Shortcuts setup and the illustrations. |
| `home/` | The main screen: the tab bar, the horizontal pager and the sheets it opens. Each tab is its own folder. |
| `insights/` | Sheets that analyse spending: limits (`alerts/`), events, forecast, the monthly summary and recurring payments (`subscriptions/`). |
| `settings/` | Sheets opened from the profile tab: account and data, premium, privacy and app lock, capture health, statement import and data export. |
| `data/` | How transactions are stored and interpreted: cloud sync, encrypted local storage, financial accounts, currency conversion, categories (`classification/`) and ignored payments. |
| `widgets/` | The iOS home screen widget and its snapshot calculator. |

## The main screen

`home/home-screen.tsx` only wires things together:

- `home/navigation/` draws the tab titles and the profile button and keeps the pager in sync.
- `home/state/` holds the hooks that load the ledger and derive the numbers every tab shows.
- `home/sheets/` decides which modal sheet is open.
- `home/overview/` is the tab with the bubbles:
  - `bubbles/` the floating glass bubbles,
  - `bubble-detail/` the full-screen view a bubble opens, with its `area-chart/`,
  - `period/` the period switcher,
  - `spending/` spending summaries and trends,
  - `shortcuts/` the cards under the bubbles.
- `home/transactions/`, `home/merchants/` and `home/profile/` are the other tabs.

## Conventions

- A screen file composes; the pieces it draws live in a `components/` folder next to it.
- State and side effects of a screen live in a `use-*.ts` hook next to the screen.
- Copy lives in `*-copy.ts`, pure logic in plain `.ts` files with a `.test.ts` beside them.
- Inside one feature, imports are relative. Across features, imports use `@/features/...`.
