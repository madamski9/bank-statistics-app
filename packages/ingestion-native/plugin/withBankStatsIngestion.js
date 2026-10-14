const fs = require('fs');
const path = require('path');
const {
  withDangerousMod,
  withEntitlementsPlist,
  withInfoPlist,
  withPodfile,
  withXcodeProject,
  IOSConfig,
} = require('expo/config-plugins');

const APP_INTENT_SOURCE = path.join(__dirname, '..', 'app', 'IngestMillenniumNotificationIntent.swift');
const APP_INTENT_FILENAME = 'IngestMillenniumNotificationIntent.swift';
const LEGACY_APP_INTENTS_PACKAGE_FILENAME = 'BankStatsAppIntentsPackage.swift';

function resolveAppGroup(config) {
  const bundleIdentifier = config.ios?.bundleIdentifier;

  if (!bundleIdentifier) {
    throw new Error('An iOS bundle identifier is required for BankStats ingestion');
  }

  return `group.${bundleIdentifier}.ingestion`;
}

const PARSER_RULES_SOURCE = require.resolve(
  '@bankstats/parser-rules/rules/bank-notification-rules.json',
);
const PARSER_RULES_DESTINATION = path.join(
  __dirname,
  '..',
  'ios',
  'Resources',
  'BankNotificationRules.json',
);

function copyParserRules() {
  fs.mkdirSync(path.dirname(PARSER_RULES_DESTINATION), { recursive: true });
  fs.copyFileSync(PARSER_RULES_SOURCE, PARSER_RULES_DESTINATION);
}

function withBankStatsIngestion(config) {
  const appGroup = resolveAppGroup(config);

  config = withDangerousMod(config, [
    'ios',
    (result) => {
      copyParserRules();
      return result;
    },
  ]);

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
    const filepath = `${projectName}/${APP_INTENT_FILENAME}`;
    const legacyFilepath = `${projectName}/${LEGACY_APP_INTENTS_PACKAGE_FILENAME}`;
    const project = result.modResults;
    const target = IOSConfig.XcodeUtils.getApplicationNativeTarget({ project, projectName });

    fs.copyFileSync(APP_INTENT_SOURCE, path.join(platformProjectRoot, filepath));

    if (project.hasFile(legacyFilepath)) {
      project.removeSourceFile(legacyFilepath, { target: target.uuid }, project.findPBXGroupKey({ name: projectName }));
    }

    fs.rmSync(path.join(platformProjectRoot, legacyFilepath), { force: true });

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
module.exports.copyParserRules = copyParserRules;
