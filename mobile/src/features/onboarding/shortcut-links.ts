const shortcutUrls: Record<string, string> = {
  millennium: 'https://www.icloud.com/shortcuts/45c335f2b7ad450885f9613939fe7b1f',
  pko: 'https://www.icloud.com/shortcuts/fc6262c04b8c4a218b88a9a92ce8f381',
  'millennium+pko': 'https://www.icloud.com/shortcuts/8920bdb2274d4782b71ae72b1732ea0e',
};

const shortcutBankOrder = ['millennium', 'pko', 'ing'];

export function shortcutUrlFor(selectedBanks: string[]): string | null {
  const key = shortcutBankOrder.filter((bank) => selectedBanks.includes(bank)).join('+');

  return shortcutUrls[key] ?? null;
}
