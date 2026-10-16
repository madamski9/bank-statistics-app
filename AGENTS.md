# Repository Instructions

## Code Style

- Never add comments to source code.
- Do not add inline comments, block comments, documentation comments, or TODO comments.
- Keep source files as pure code and express intent through clear naming and structure.

## Commits and Pull Requests

- Never mention AI tools or agents in commits, pull requests, issues, or comments. This includes footers such as "Generated with Claude Code" and robot emoji signatures.
- Never add AI tools or agents as co-authors or collaborators. Do not use `Co-Authored-By` trailers for Claude, Codex, Copilot, or any other agent.
- Commits and pull requests are authored only by the human contributors.

## Android Work

- Android work follows the order and rules in `docs/ANDROID-PARITY.md`. Read it before picking up any issue labelled `platform: android`.
- Build only what iOS already does. Anything beyond parity needs its own issue.

### Starting an Android issue

1. Read `docs/ANDROID-PARITY.md`, the ADRs it links, and `CONTEXT.md`.
2. If no issue number was given, take the first issue in the order table whose blockers are all closed. Read it with `gh issue view <number>`, including its comments, and treat its acceptance criteria as the definition of done.
3. Read the iOS implementation of the same behaviour first: Swift in `packages/ingestion-native/ios` and the shared TypeScript. Kotlin exposes the same API from `packages/ingestion-native/src/index.ts`.
4. Read the Expo SDK 57 docs at https://docs.expo.dev/versions/v57.0.0/ before using any Expo API.
5. Create a branch named after the issue (for example `feat/android-ingestion-module`), and open one pull request against `main` that closes the issue. Tick the criteria that are met and list the ones that are not.
6. Ask the user about any decision that the issue, the ADRs and `docs/ANDROID-PARITY.md` do not settle. Do not guess.

### Android environment on the Linux workstation

- Bun 1.4.2 and JDK 17 come from mise. The Android SDK is in `~/Android/Sdk`, and Gradle gets 4 GB of memory through `~/.gradle/gradle.properties`.
- The emulator is the AVD `BankStats_API36` (Android 16). The user watches it in its own desktop window and in the T3 Device panel at the same time, so do not let the panel boot it headless:
  1. If `adb devices` already lists `emulator-5554` with a window and `-gpu host`, reuse it.
  2. Otherwise start it with a window on the NVIDIA GPU, detached from the shell: `setsid nohup ~/Android/Sdk/emulator/emulator -avd BankStats_API36 -gpu host -no-boot-anim -port 5554 > /tmp/bankstats-emulator.log 2>&1 < /dev/null &`. Wait until `adb -s emulator-5554 shell getprop sys.boot_completed` prints `1`.
  3. Attach the T3 Device panel to that running instance with `device_open` and the device id `emulator-5554`.
- The AVD's `config.ini` sets `hw.gpu.enabled=yes` and `hw.gpu.mode=host`. Check the renderer with `adb -s emulator-5554 shell dumpsys SurfaceFlinger | grep GLES:`, which must name the NVIDIA GPU. If the emulator command line shows SwiftShader or `-gpu auto` without `-gpu host`, stop and tell the user: SwiftShader crashes the emulator while BankStats renders.
- Build and run from `mobile` with `bunx expo run:android --device BankStats_API36`. After the first build, `bunx expo start --dev-client` is enough until native code changes. When one Metro serves the emulator and the phone together, do not set `REACT_NATIVE_PACKAGER_HOSTNAME`: without it Metro answers each device with the host it asked for, so the emulator loads the bundle through `10.0.2.2` and a USB phone through `localhost`. Forcing `10.0.2.2` leaves the phone unable to load the bundle and its icon fonts. `./run.sh android` sets the variable for the one device it finds, which is fine for a single device.
- Check UI changes with screenshots on the emulator. Capture, battery and lock behaviour is checked on the user's Samsung S24 FE over USB, so ask the user to connect it when an issue needs it.
- On the phone, build with `bunx expo run:android --device SM_S721B` (the name Expo shows, not the adb serial), run `adb -s <serial> reverse tcp:8081 tcp:8081`, and open the app with the dev client URL `http://localhost:8081`. The phone is the user's own, so take screenshots only while BankStats is in the foreground, and delete any screenshot that shows other apps or sign-in tokens.
- Before opening a pull request, run `bun run typecheck`, `bun test` and `bun run lint` from the repository root.

## Frontend Structure

- Organize frontend code by product feature.
- Keep each feature's components, hooks, state, validation, and tests together.
- Do not create repository-wide folders grouped only by technical type, such as global `components`, `hooks`, or `utils` folders.
