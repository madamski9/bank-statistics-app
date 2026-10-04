import Foundation

private final class ParserRulesBundleToken {}

extension BankNotificationInterpreter {
  private static let bundledInterpreter: Result<BankNotificationInterpreter, IngestionError> = loadBundled()

  static func bundled() throws -> BankNotificationInterpreter {
    try bundledInterpreter.get()
  }

  private static func loadBundled() -> Result<BankNotificationInterpreter, IngestionError> {
    let frameworkBundle = Bundle(for: ParserRulesBundleToken.self)

    guard let bundleURL = frameworkBundle.url(forResource: "BankStatsParserRules", withExtension: "bundle"),
      let resources = Bundle(url: bundleURL),
      let rulesURL = resources.url(forResource: "BankNotificationRules", withExtension: "json"),
      let data = try? Data(contentsOf: rulesURL),
      let bundle = try? JSONDecoder().decode(BankNotificationRuleBundle.self, from: data),
      let interpreter = try? BankNotificationInterpreter(bundle: bundle)
    else {
      return .failure(.parserRulesUnavailable)
    }

    return .success(interpreter)
  }
}
