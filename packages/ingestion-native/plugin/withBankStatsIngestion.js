const fs = require('fs');
const path = require('path');
const {
  withEntitlementsPlist,
  withInfoPlist,
  withPodfile,
  withXcodeProject,
  IOSConfig,
} = require('expo/config-plugins');

const APP_INTENTS_PACKAGE_SOURCE = `import AppIntents
public import BankStatsIngestion

struct BankStatsAppIntentsPackage: AppIntentsPackage {
  static var includedPackages: [any AppIntentsPackage.Type] {
    [BankStatsIngestionAppIntentsPackage.self]
  }
}
`;

function resolveAppGroup(config) {
  const bundleIdentifier = config.ios?.bundleIdentifier;

  if (!bundleIdentifier) {
    throw new Error('An iOS bundle identifier is required for BankStats ingestion');
  }

  return `group.${bundleIdentifier}.ingestion`;
}

function withBankStatsIngestion(config) {
  const appGroup = resolveAppGroup(config);

  config = withEntitlementsPlist(config, (result) => {
    result.modResults['com.apple.security.application-groups'] = [appGroup];
    return result;
  });

  config = withInfoPlist(config, (result) => {
    result.modResults.BankStatsIngestionAppGroup = appGroup;
    return result;
  });

  config = withPodfile(config, (result) => {
    const target = /target '[^']+' do\n/;
    const dependency = "  pod 'SQLCipher', '~> 4.10.0', :modular_headers => true\n";
    const postInstall = `  post_install do |installer|\n`;
    const sqlCipherDefinitionsFix = `    installer.aggregate_targets.each do |aggregate_target|
      aggregate_target.xcconfigs.each do |configuration_name, xcconfig|
        definitions = xcconfig.attributes['GCC_PREPROCESSOR_DEFINITIONS']
        next unless definitions
        xcconfig.attributes['GCC_PREPROCESSOR_DEFINITIONS'] = definitions
          .split
          .reject { |definition| ['_SQLITE3_H_=1', '_FTS5_H=1', '_SQLITE3RTREE_H_=1'].include?(definition) }
          .join(' ')
        xcconfig.save_as(aggregate_target.xcconfig_path(configuration_name))
      end
    end
`;

    if (!result.modResults.contents.includes(dependency)) {
      result.modResults.contents = result.modResults.contents.replace(
        target,
        (match) => `${match}${dependency}`,
      );
    }

    if (!result.modResults.contents.includes(sqlCipherDefinitionsFix)) {
      result.modResults.contents = result.modResults.contents.replace(
        postInstall,
        `${postInstall}${sqlCipherDefinitionsFix}`,
      );
    }

    return result;
  });

  config = withXcodeProject(config, (result) => {
    const platformProjectRoot = result.modRequest.platformProjectRoot;
    const projectName = IOSConfig.XcodeUtils.getHackyProjectName(
      result.modRequest.projectRoot,
      result
    );
    const filepath = `${projectName}/BankStatsAppIntentsPackage.swift`;
    const absoluteFilepath = path.join(platformProjectRoot, filepath);
    const project = result.modResults;
    const target = IOSConfig.XcodeUtils.getApplicationNativeTarget({ project, projectName });

    fs.writeFileSync(absoluteFilepath, APP_INTENTS_PACKAGE_SOURCE);

    if (!project.hasFile(filepath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath,
        groupName: projectName,
        project,
        targetUuid: target.uuid,
      });
    }

    return result;
  });

  return config;
}

module.exports = withBankStatsIngestion;
