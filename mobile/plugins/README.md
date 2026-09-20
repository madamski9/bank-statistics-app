# Local Expo config plugins

## `withUISceneLifecycle.js`

Xcode 27 and the iOS 27 SDK require the UIKit scene-based life cycle at launch. An app built
without a `UIApplicationSceneManifest` fails to start with:

```
Application failed to launch: UIScene life cycle is required for apps built with this SDK.
```

Expo's prebuild template does not adopt the scene life cycle as of SDK 57.0.22, so a generated
project crashes on launch. Both upstream reports are open and unresolved:

- https://github.com/expo/expo/issues/46663
- https://github.com/expo/expo/issues/46664

`ios/` is generated and git-ignored, so the patch cannot live in the native project. This plugin
reapplies it on every prebuild:

1. Adds `UIApplicationSceneManifest` to `Info.plist`, pointing at `SceneDelegate`.
2. Writes `SceneDelegate.swift` and registers it in the Xcode project, creating the window and
   starting React Native from `scene(_:willConnectTo:options:)`, and forwarding deep links and
   universal links to `RCTLinkingManager`.
3. Removes window creation from `AppDelegate.didFinishLaunchingWithOptions`, keeping the launch
   options for the scene delegate to consume.

Both patch steps assert on the template text they expect and throw if Expo changes it, so a
template change fails the prebuild loudly instead of silently producing an app that cannot launch.

Remove this plugin once Expo's template adopts the scene life cycle upstream.

## `withDisableUserScriptSandboxing.js`

One of expo-dev-launcher's Run Script build phases writes the machine's LAN IP (`ip.txt`) directly
into the built app bundle, so a physical device knows where to find Metro. Xcode's "User Script
Sandboxing" (default on since Xcode 15) blocks any Run Script phase from writing paths it didn't
declare as outputs, and this phase doesn't declare that one, so a device build (not simulator)
fails with:

```
Sandbox: bash(...) deny(1) file-write-create .../BankStats.app/ip.txt
```

This is a known Xcode 15+ incompatibility, not specific to this script. The documented fix is to
turn sandboxing off (`ENABLE_USER_SCRIPT_SANDBOXING = NO`); it must be set on every build
configuration, since both the project level and the target level enforce it independently. This
plugin sets it on every build configuration in the generated Xcode project on each prebuild.
