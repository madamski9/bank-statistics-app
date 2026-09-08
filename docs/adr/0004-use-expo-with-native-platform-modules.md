# Use Expo with native platform modules

The mobile application will use Expo development builds and generated native projects while implementing notification ingestion, App Intents, and widgets in dedicated Swift and Kotlin modules. Expo Go is not a supported runtime. If generated iOS extension targets prove unstable, the project will retain Expo while committing and directly maintaining the native projects. This preserves a shared React Native product layer without giving up the platform APIs required by the core ingestion flow.
