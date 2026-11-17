# BankStats website

Static pages with no build step, external fonts, analytics, or paid services.

From the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory website
```

Open `http://127.0.0.1:4173/`.

## Hosting

The site is served by the Cloudflare Pages project `bankstats` at `https://bankstats.app` and `https://www.bankstats.app`. The project uses direct upload, so publish changes from the repository root:

```sh
bunx wrangler pages deploy website --project-name bankstats --branch main
```

The `bankstats.app` zone uses Cloudflare nameservers, because Pages serves an apex domain only from a Cloudflare zone. The Clerk records (`clerk`, `accounts`, `clkmail`, `clk._domainkey`, `clk2._domainkey`) stay `DNS only`, never proxied.

## Store URLs

Use these public URLs in App Store Connect:

| Field | Site path |
| --- | --- |
| Privacy Policy URL | `https://bankstats.app/privacy/` |
| Support URL | `https://bankstats.app/support/` |
| Terms of service, in the App Store description or as a custom license | `https://bankstats.app/terms/` |
| Marketing URL, optional | `https://bankstats.app/` |

The privacy policy must also be linked from inside the iOS app before submitting it for review. Keep its data-processing details aligned with the shipped app and configured production services. The `/delete-account/` page explains the in-app deletion path and can be used as a privacy choices URL.

## Landing page

The landing page styles and interactions live in `landing/`. The phone preview has clickable navigation tabs, an expense bubble, a report tile and the Żabka shop row. Detail screens support closing and the Escape key. It switches between real screenshots, and the notification-limit simulator lets visitors try different tones and limit values. These interactions respect reduced-motion preferences and require no external requests or build step.

The simulator uses the Polish notification texts from `mobile/src/features/insights/alerts/delivery/budget-alert-copy.ts` and `payment-alert-copy.ts`. It includes general, food and shop limits, all three tones, and the 50%, 80%, 90% and 100% thresholds. Visitors can browse variants manually.

After changing the app's notification copy, refresh the static snapshot from the repository root:

```sh
bun scripts/sync-website-notifications.ts
```

The phone shell uses Three.js 0.182.0 with a projected HTML display so its screen remains interactive. The locally bundled module and MIT license are in `landing/vendor/`. It renders on demand, respects reduced motion, stops offscreen and when the tab is hidden, and falls back to the HTML phone when WebGL is unavailable.

To regenerate the vendor module, use Three.js 0.182.0 and esbuild 0.28.2 in a temporary directory. Re-export the Three.js classes imported by `phone-scene.js`, plus `RoomEnvironment` from `three/addons/environments/RoomEnvironment.js`, then bundle that entry:

```sh
esbuild phone-three-entry.js --bundle --minify --format=esm --supported:template-literal=false --legal-comments=none --outfile=website/landing/vendor/three.js
```

Retain `landing/vendor/THREE-LICENSE.txt` alongside the bundle.
