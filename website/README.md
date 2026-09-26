# BankStats website

Static pages with no build step, external fonts, analytics, or paid services.

From the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory website
```

Open `http://127.0.0.1:4173/`.

After publishing the site, use these public URLs in App Store Connect:

| Field | Site path |
| --- | --- |
| Privacy Policy URL | `/privacy/` |
| Support URL | `/support/` |
| Marketing URL, optional | `/` |

The privacy policy must also be linked from inside the iOS app before submitting it for review. Keep its data-processing details aligned with the shipped app and configured production services. The `/delete-account/` page explains the in-app deletion path and can be used as a privacy choices URL.
