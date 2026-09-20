import Foundation
import Security

struct OutboxKeyStore {
  private let service = "com.bankstats.ingestion.outbox"
  private let account = "sqlcipher-key-v1"

  func loadOrCreate() throws -> Data {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    var result: CFTypeRef?
    let copyStatus = SecItemCopyMatching(query as CFDictionary, &result)

    if copyStatus == errSecSuccess, let data = result as? Data {
      return data
    }

    guard copyStatus == errSecItemNotFound else {
      throw IngestionError.keychain(copyStatus)
    }

    var key = Data(count: 32)
    let randomStatus = key.withUnsafeMutableBytes { bytes in
      SecRandomCopyBytes(kSecRandomDefault, 32, bytes.baseAddress!)
    }

    guard randomStatus == errSecSuccess else {
      throw IngestionError.keychain(randomStatus)
    }

    let addQuery: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
      kSecValueData as String: key,
    ]
    let addStatus = SecItemAdd(addQuery as CFDictionary, nil)

    guard addStatus == errSecSuccess else {
      throw IngestionError.keychain(addStatus)
    }

    return key
  }
}
