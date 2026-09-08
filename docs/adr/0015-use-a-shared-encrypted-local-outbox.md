# Use a shared encrypted local outbox

Native notification collectors and the React Native host will exchange normalized records through one SQLCipher-backed SQLite outbox, with the encryption key stored in the platform secure store. This makes locked-screen and offline ingestion durable without exposing raw notification text or depending on the React Native runtime.
