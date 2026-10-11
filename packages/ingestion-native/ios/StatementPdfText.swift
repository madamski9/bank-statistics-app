import Foundation
import PDFKit

enum StatementPdfText {
  static func extract(from uri: String) throws -> String {
    let url = URL(string: uri) ?? URL(fileURLWithPath: uri)
    guard let document = PDFDocument(url: url) else {
      throw IngestionError.unreadableStatement
    }
    if document.isLocked {
      throw IngestionError.unreadableStatement
    }
    let pages = (0..<document.pageCount).compactMap { document.page(at: $0)?.string }
    return pages.joined(separator: "\n")
  }
}
