export const statementBanks = ['millennium', 'pko', 'erste'] as const;

export type StatementBank = (typeof statementBanks)[number];

const bankKeywords: Record<StatementBank, RegExp[]> = {
  millennium: [
    /bankmillennium/,
    /\bbank millennium\b/,
    /\btelemillennium\b/,
    /\bmillenet\b/,
    /\bbigbplpw/,
  ],
  pko: [/\bpko bp\b/, /\bpko bank polski\b/, /\bpkobp\b/, /\bipko\b/, /\bbpkoplpw/],
  erste: [/\berste bank\b/, /\berstebank\b/, /\berste\b/, /\bsantander bank polska\b/, /\bwbkpplpp/],
};

function searchableText(text: string): string {
  return text
    .toLocaleLowerCase('pl')
    .replace(/ł/gu, 'l')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

function hitsOf(text: string, keywords: RegExp[]): number {
  return keywords.reduce(
    (total, keyword) => total + (text.match(new RegExp(keyword.source, 'g'))?.length ?? 0),
    0,
  );
}

export function detectStatementBank(text: string): StatementBank | null {
  const searchable = searchableText(text);
  const scored = statementBanks
    .map((bank) => ({ bank, hits: hitsOf(searchable, bankKeywords[bank]) }))
    .sort((left, right) => right.hits - left.hits);
  const [best, runnerUp] = scored;

  if (best.hits === 0 || best.hits === runnerUp.hits) {
    return null;
  }

  return best.bank;
}
