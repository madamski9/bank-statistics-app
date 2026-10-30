# BankStats website

Static pages with no build step, external fonts, analytics, or paid services.

From the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory website
```

Open `http://127.0.0.1:4173/`.

## Hosting

The site is served by Cloudflare Pages at `https://bankstats.app`:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | none |
| Build output directory | `website` |
| Custom domain | `bankstats.app` |

The `bankstats.app` zone uses Cloudflare nameservers, because Pages serves an apex domain only from a Cloudflare zone. The Clerk records (`clerk`, `accounts`, `clkmail`, `clk._domainkey`, `clk2._domainkey`) stay `DNS only`, never proxied.

## Store URLs

Use these public URLs in App Store Connect:

| Field | Site path |
| --- | --- |
| Privacy Policy URL | `https://bankstats.app/privacy/` |
| Support URL | `https://bankstats.app/support/` |
| Marketing URL, optional | `https://bankstats.app/` |

The privacy policy must also be linked from inside the iOS app before submitting it for review. Keep its data-processing details aligned with the shipped app and configured production services. The `/delete-account/` page explains the in-app deletion path and can be used as a privacy choices URL.
