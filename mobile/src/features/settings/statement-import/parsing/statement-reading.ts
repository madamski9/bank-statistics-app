import { parseMbankPdfStatement } from './mbank-pdf-statement';
import { parseMillenniumPdfStatement } from './millennium-pdf-statement';
import { detectStatementBank } from './statement-bank';
import { parseStatement, type StatementParseResult } from './statement-parser';

export type StatementFormat = 'csv' | 'pdf';

export function readStatement(text: string, format: StatementFormat): StatementParseResult {
  if (format === 'csv') {
    return parseStatement(text);
  }

  if (text.trim() === '') {
    return { ok: false, problem: 'empty' };
  }

  const bank = detectStatementBank(text);

  if (bank === null) {
    return { ok: false, problem: 'unsupportedBank' };
  }

  if (bank === 'millennium') {
    return parseMillenniumPdfStatement(text);
  }

  if (bank === 'mbank') {
    return parseMbankPdfStatement(text);
  }

  return { ok: false, problem: 'unsupportedPdf' };
}
