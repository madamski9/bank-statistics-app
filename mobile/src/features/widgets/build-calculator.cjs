const path = require('node:path');
const { buildSync } = require('esbuild');
const calculatorDirectory = path.dirname(require.resolve('./build-calculator.cjs'));

function buildWidgetCalculator(outfile) {
  buildSync({
    entryPoints: [path.join(calculatorDirectory, 'widget-background.ts')],
    outfile,
    bundle: true,
    platform: 'browser',
    target: 'es2020',
    format: 'iife',
    globalName: 'BankStatsWidgetCalculator',
    minify: true,
    legalComments: 'none',
    tsconfig: path.resolve(calculatorDirectory, '../../../tsconfig.json'),
  });
}

module.exports = { buildWidgetCalculator };
