# Share parser rules across native interpreters

Notification ingestion must work when the React Native runtime is unavailable, so Swift and Kotlin implement thin interpreters for one shared, versioned set of bank rules and test examples. This duplicates a small amount of platform code but avoids storing raw notification text until the main application launches.
