# Deliver signed parser rules to devices

The application will ship with a working bank-rule bundle and may download newer versioned bundles from Convex after verifying their signature on the device. Rules and redacted test examples live in Git; CI tests both native interpreters before signing a release with an offline key. Devices accept only valid newer bundles and retain the last working version for rollback. This permits rapid adaptation to bank notification changes without an app-store release while preventing untrusted server content from silently changing native parsing behavior.
