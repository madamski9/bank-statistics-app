const { withXcodeProject } = require('@expo/config-plugins');

// One of expo-dev-launcher's Run Script build phases writes the machine's LAN
// IP (ip.txt) directly into the built app bundle, so a physical device knows
// where to find Metro. Xcode's "User Script Sandboxing" (default on since
// Xcode 15) blocks any Run Script phase from writing paths it didn't declare
// as outputs, and this phase doesn't declare that one, so a device build
// fails with:
//
//   Sandbox: bash(...) deny(1) file-write-create .../BankStats.app/ip.txt
//
// This is a known Xcode 15+ incompatibility, not specific to this script —
// see the many "Sandbox: bash deny" reports for other CocoaPods/RN projects.
// The documented fix is to turn sandboxing off; it has to be set on every
// build configuration (project-level and target-level both enforce it).
module.exports = function withDisableUserScriptSandboxing(config) {
  return withXcodeProject(config, (config) => {
    const configurations = config.modResults.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const buildSettings = configurations[key]?.buildSettings;
      if (buildSettings) {
        buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
      }
    }
    return config;
  });
};
