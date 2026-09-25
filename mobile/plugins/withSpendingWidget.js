const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');
const { buildWidgetCalculator } = require('../src/features/widgets/build-calculator.cjs');

module.exports = function withSpendingWidget(config) {
  return withDangerousMod(config, ['ios', (result) => {
    buildWidgetCalculator(path.resolve(
      result.modRequest.projectRoot,
      '../packages/ingestion-native/ios/Resources/SpendingWidgetCalculator.js',
    ));
    return result;
  }]);
};
