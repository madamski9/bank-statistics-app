const { withEntitlementsPlist, withInfoPlist, withPodfile } = require('expo/config-plugins');

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

    if (!result.modResults.contents.includes(dependency)) {
      result.modResults.contents = result.modResults.contents.replace(
        target,
        (match) => `${match}${dependency}`,
      );
    }

    return result;
  });

  return config;
}

module.exports = withBankStatsIngestion;
