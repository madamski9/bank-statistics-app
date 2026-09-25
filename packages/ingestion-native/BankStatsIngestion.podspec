require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'BankStatsIngestion'
  s.version = package['version']
  s.summary = 'On-device notification ingestion for BankStats'
  s.description = 'On-device notification ingestion for BankStats'
  s.license = 'MIT'
  s.author = 'BankStats'
  s.homepage = 'https://github.com/madamski9/bank-statistics-app'
  s.platforms = { :ios => '17.0' }
  s.swift_version = '6.0'
  s.source = { :git => 'https://github.com/madamski9/bank-statistics-app.git' }
  s.static_framework = true
  s.source_files = 'ios/**/*.{h,m,swift}'
  s.frameworks = 'AppIntents', 'JavaScriptCore', 'WidgetKit'
  s.resource_bundles = { 'BankStatsWidgets' => ['ios/Resources/*.js'] }
  s.dependency 'ExpoModulesCore'
  s.dependency 'SQLCipher', '~> 4.10.0'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'GCC_PREPROCESSOR_DEFINITIONS' => '$(inherited) SQLITE_HAS_CODEC=1'
  }
end
