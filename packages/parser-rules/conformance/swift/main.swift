import Foundation

struct ExampleInput: Decodable {
  let title: String
  let subtitle: String
  let body: String
  let sourceApp: String
}

struct Example: Decodable {
  let name: String
  let input: ExampleInput
}

struct ExampleFile: Decodable {
  let capturedAt: String
  let examples: [Example]
}

let arguments = CommandLine.arguments
let rulesData = try Data(contentsOf: URL(fileURLWithPath: arguments[1]))
let examplesData = try Data(contentsOf: URL(fileURLWithPath: arguments[2]))
let interpreter = try BankNotificationInterpreter(
  bundle: JSONDecoder().decode(BankNotificationRuleBundle.self, from: rulesData)
)
let file = try JSONDecoder().decode(ExampleFile.self, from: examplesData)
let expectations = (try JSONSerialization.jsonObject(with: examplesData) as! [String: Any])["examples"] as! [[String: Any]]
let capturedAt = ISO8601DateFormatter().date(from: file.capturedAt)!
var failures = 0

for (example, expectation) in zip(file.examples, expectations) {
  let outcome = interpreter.normalize(
    title: example.input.title,
    subtitle: example.input.subtitle,
    body: example.input.body,
    sourceApp: example.input.sourceApp,
    capturedAt: capturedAt
  )
  let actual: [String: Any]

  switch outcome {
  case .record(let record):
    var fields = record.dictionary
    fields.removeValue(forKey: "id")
    fields.removeValue(forKey: "origin")
    actual = ["outcome": "record", "record": fields]
  case .ignored(let reason):
    actual = ["outcome": "ignored", "reason": reason]
  }

  let expected = expectation["expected"] as! [String: Any]

  if !NSDictionary(dictionary: actual).isEqual(to: expected) {
    failures += 1
    print("FAIL \(example.name)\n  expected: \(expected)\n  actual:   \(actual)")
  }
}

print("\(file.examples.count - failures)/\(file.examples.count) examples conform")
exit(failures == 0 ? 0 : 1)
